#!/usr/bin/env bun
import { parseArgs } from 'util'
import path from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { getGitSha, isGitDirty, makeResultDir } from './lib/git'
import { buildFixture } from './lib/fixture'
import { copyWebDir, packAssets } from './lib/host'
import { buildBenchHost, podInstall } from './lib/xcode'
import { listDevices, installApp, terminateApp, isSimulator, readBenchMarks } from './lib/device'
import { recordTrace, exportTrace } from './lib/xctrace'
import { parseTraceXml } from './lib/parse'
import { computeMetrics, aggregate } from './lib/metrics'
import { generateReport } from './lib/report'
import type { BenchConfig, RunResult, BenchReport, DeviceInfo } from './lib/types'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    label: { type: 'string', default: 'unnamed' },
    runs: { type: 'string', default: '10' },
    warmup: { type: 'string', default: '2' },
    mode: { type: 'string', default: 'cold' },
    device: { type: 'string' },
    scheme: { type: 'string', default: 'BenchHost' },
    'skip-build': { type: 'boolean', default: false },
    'skip-fixture-build': { type: 'boolean', default: false },
    'allow-dirty': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
})

if (values.help) {
  console.log(`
Pacit Benchmark Runner

Usage: bun run bench.ts [options]

Options:
  --label <string>         Label for this run (e.g. "baseline-stock")
  --runs <n>               Number of measured iterations (default: 10)
  --warmup <n>             Warmup runs before measurement (default: 2)
  --mode <cold|warm>       Cold (kill+relaunch) or warm (default: cold)
  --device <udid>          Target device UDID (auto-detect if one connected)
  --scheme <name>          Xcode scheme (default: BenchHost)
  --skip-build             Reuse existing BenchHost build
  --skip-fixture-build     Reuse existing fixture build
  --allow-dirty            Allow dirty git tree
  --dry-run                Build and install but don't measure
  --help                   Show this help
  `)
  process.exit(0)
}

const config: BenchConfig = {
  label: values.label!,
  runs: parseInt(values.runs!, 10),
  warmup: parseInt(values.warmup!, 10),
  mode: values.mode as 'cold' | 'warm',
  device: values.device,
  scheme: values.scheme!,
  skipBuild: values['skip-build']!,
  skipFixtureBuild: values['skip-fixture-build']!,
  allowDirty: values['allow-dirty']!,
  dryRun: values['dry-run']!,
}

async function main() {
  console.log(`\n🏁 Pacit Benchmark Runner`)
  console.log(`   Label: ${config.label}`)
  console.log(`   Runs: ${config.runs} (+ ${config.warmup} warmup)`)
  console.log(`   Mode: ${config.mode}\n`)

  // 1. Preflight
  const gitSha = await getGitSha()
  const gitDirty = await isGitDirty()
  if (gitDirty && !config.allowDirty) {
    console.error('❌ Git tree is dirty. Use --allow-dirty to proceed.')
    process.exit(1)
  }

  // Find device
  const devices = await listDevices()
  let deviceUdid = config.device
  let deviceInfo: DeviceInfo

  if (!deviceUdid) {
    if (devices.length === 0) {
      console.error('❌ No connected iOS devices found. Connect an iPhone via USB.')
      process.exit(1)
    }
    if (devices.length > 1) {
      console.error('❌ Multiple devices found. Specify one with --device <udid>:')
      devices.forEach(d => console.error(`   ${d.udid}  ${d.name} (${d.model})`))
      process.exit(1)
    }
    deviceUdid = devices[0].udid
    deviceInfo = devices[0]
  } else {
    const found = devices.find(d => d.udid === deviceUdid)
    deviceInfo = found ?? { udid: deviceUdid, name: 'Unknown', model: 'Unknown', osVersion: 'Unknown' }
  }

  // Refuse simulator
  if (await isSimulator(deviceUdid)) {
    console.error('❌ Simulator detected. Real device only — simulator masks I/O perf.')
    process.exit(1)
  }

  console.log(`📱 Device: ${deviceInfo.name} (${deviceInfo.model}, iOS ${deviceInfo.osVersion})`)

  // 2. Build fixture
  let fixtureOutput: string
  if (!config.skipFixtureBuild) {
    fixtureOutput = await buildFixture()
  } else {
    fixtureOutput = path.resolve(import.meta.dir, '../fixtures/nuxt-mini/.output/public')
    console.log('⏭️  Skipping fixture build (--skip-fixture-build)')
  }

  // 3. Copy webDir + pack assets into .pak archive
  await copyWebDir(fixtureOutput)
  await packAssets(fixtureOutput)

  // 4. Build and install BenchHost
  if (!config.skipBuild) {
    await podInstall()
    const appPath = await buildBenchHost({
      scheme: config.scheme,
      device: deviceUdid,
      teamId: process.env.PACIT_BENCH_TEAM_ID,
    })
    await installApp(deviceUdid, appPath)
  } else {
    console.log('⏭️  Skipping build (--skip-build)')
  }

  if (config.dryRun) {
    console.log('\n🏁 Dry run complete. Exiting.')
    process.exit(0)
  }

  // 5. Create results directory
  const resultDirName = makeResultDir(gitSha, config.label)
  const resultDir = path.resolve(import.meta.dir, '../results', resultDirName)
  mkdirSync(resultDir, { recursive: true })

  // Save device info
  writeFileSync(path.join(resultDir, 'device-info.json'), JSON.stringify(deviceInfo, null, 2))

  // 6. Run benchmark loop
  const allResults: RunResult[] = []
  const totalRuns = config.warmup + config.runs

  console.log(`\n🔄 Running ${totalRuns} iterations (${config.warmup} warmup + ${config.runs} measured)...\n`)

  for (let i = 0; i < totalRuns; i++) {
    const isWarmup = i < config.warmup
    const runLabel = isWarmup ? `warmup-${i + 1}` : `run-${i - config.warmup + 1}`
    console.log(`--- ${runLabel} ${isWarmup ? '(warmup, not counted)' : ''} ---`)

    // Cold mode: kill the app first, wait longer for clean termination
    if (config.mode === 'cold') {
      await terminateApp(deviceUdid, 'xyz.pacit.benchhost')
      await Bun.sleep(5000)
    }

    // Record App Launch trace + read JS timing from pasteboard
    const tracePath = path.join(resultDir, `${runLabel}.trace`)
    try {
      const traces = await recordTrace({
        deviceUdid: deviceUdid,
        outputPath: tracePath,
        timeoutSec: 15,
      })

      // Export lifecycle data from App Launch trace
      const lifecycleXml = path.join(resultDir, `${runLabel}.lifecycle.xml`)
      await exportTrace(traces.lifecycle, lifecycleXml)
      const lifecycleEvents = parseTraceXml(lifecycleXml)

      // Pull JS timing marks from app's Documents directory on device
      await Bun.sleep(1000)
      const jsMarks = await readBenchMarks(deviceUdid)

      const events = lifecycleEvents
      const metrics = computeMetrics(lifecycleEvents, jsMarks)

      const t3Str = metrics.t3 >= 0 ? `${Math.round(metrics.t3)} ms` : 'N/A'
      const wlStr = metrics.windowLoad >= 0 ? `${Math.round(metrics.windowLoad)} ms` : 'N/A'
      console.log(`  T3(native) = ${t3Str} | window.load = ${wlStr}`)

      if (!isWarmup) {
        allResults.push({
          runIndex: i - config.warmup,
          events,
          metrics,
        })
      }
    } catch (err) {
      console.error(`  ⚠️  Run ${runLabel} failed: ${err}`)
      if (!isWarmup) {
        allResults.push({
          runIndex: i - config.warmup,
          events: [],
          metrics: { t1: -1, t2: -1, t3: -1, t4: -1, windowLoad: -1 },
        })
      }
    }
  }

  // 7. Aggregate metrics
  const t1Values = allResults.map(r => r.metrics.t1)
  const t2Values = allResults.map(r => r.metrics.t2)
  const t3Values = allResults.map(r => r.metrics.t3)
  const t4Values = allResults.map(r => r.metrics.t4)
  const wlValues = allResults.map(r => (r.metrics as any).windowLoad ?? -1)

  const report: BenchReport = {
    label: config.label,
    gitSha,
    gitDirty,
    date: new Date().toISOString(),
    device: deviceInfo,
    runs: config.runs,
    warmup: config.warmup,
    mode: config.mode,
    t1: aggregate(t1Values),
    t2: aggregate(t2Values),
    t3: aggregate(t3Values),
    t4: aggregate(t4Values),
    t5: aggregate(wlValues),  // repurpose t5 for window.load
    phases: [],
    assetRequests: [],
  }

  // Extract phase breakdown from the run closest to median T3
  const medianT3 = report.t3.median
  if (allResults.length > 0) {
    const medianRun = allResults.reduce((best, r) =>
      Math.abs(r.metrics.t3 - medianT3) < Math.abs(best.metrics.t3 - medianT3) ? r : best
    )

    for (const event of medianRun.events) {
      if (event.kind === 'interval' && event.duration != null) {
        if (event.name === 'asset.request') {
          report.assetRequests.push({
            path: event.meta?.path ?? 'unknown',
            sizeBytes: parseInt(event.meta?.size ?? '0', 10),
            diskTimeMs: event.duration / 1_000_000,
          })
        } else {
          report.phases.push({
            name: event.name,
            startMs: event.tStart / 1_000_000,
            durationMs: event.duration / 1_000_000,
            notes: '',
          })
        }
      }
    }
  }

  // 8. Generate report
  writeFileSync(path.join(resultDir, 'raw.json'), JSON.stringify(allResults, null, 2))
  generateReport(report, resultDir)

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  RESULTS — ${config.label}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`  T3 native (foreground-active): ${Math.round(report.t3.median)} ms (median of ${config.runs} runs)`)
  console.log(`  window.load (web content): ${report.t5 && report.t5.median >= 0 ? Math.round(report.t5.median) + ' ms' : 'N/A (rebuild BenchHost in Xcode to enable)'}`)
  console.log(`  T1: ${Math.round(report.t1.median)} ms | T2: ${Math.round(report.t2.median)} ms | T4: ${Math.round(report.t4.median)} ms`)
  console.log(`  Variance: ${report.t3.median > 0 ? ((report.t3.stddev / report.t3.median) * 100).toFixed(1) : '?'}%`)
  console.log(`  Report: ${resultDir}/report.md`)
  console.log(`${'='.repeat(60)}\n`)
}

main().catch(err => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
