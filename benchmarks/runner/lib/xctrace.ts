import { existsSync } from 'fs'
import path from 'path'

const BUNDLE_ID = 'xyz.pacit.benchhost'

export async function recordTrace(opts: {
  deviceUdid: string
  outputPath: string
  timeoutSec?: number
}): Promise<{ lifecycle: string }> {
  const tracePath = opts.outputPath.endsWith('.trace') ? opts.outputPath : `${opts.outputPath}.trace`
  const timeout = opts.timeoutSec ?? 15

  console.log(`  🔴 Recording trace...`)

  const proc = Bun.spawn([
    'xcrun', 'xctrace', 'record',
    '--template', 'App Launch',
    '--device', opts.deviceUdid,
    '--output', tracePath,
    '--time-limit', `${timeout}s`,
    '--launch', '--', BUNDLE_ID,
  ], { stdout: 'pipe', stderr: 'pipe' })

  await proc.exited

  return { lifecycle: tracePath }
}

export async function exportTrace(tracePath: string, outputPath: string): Promise<string> {
  const xmlPath = outputPath.endsWith('.xml') ? outputPath : `${outputPath}.xml`

  // First get the TOC to find available table schemas
  const tocProc = Bun.spawn([
    'xcrun', 'xctrace', 'export',
    '--input', tracePath,
    '--toc',
  ], { stdout: 'pipe', stderr: 'pipe' })

  const tocOutput = await new Response(tocProc.stdout).text()
  await tocProc.exited

  // Prefer life-cycle-period (App Launch template), then os-signpost, then os-log
  let xpath: string
  if (tocOutput.includes('life-cycle-period')) {
    xpath = '/trace-toc/run[1]/data/table[@schema="life-cycle-period"]'
  } else if (tocOutput.includes('os-signpost')) {
    xpath = '/trace-toc/run[1]/data/table[@schema="os-signpost"]'
  } else if (tocOutput.includes('os-log')) {
    xpath = '/trace-toc/run[1]/data/table[@schema="os-log"]'
  } else {
    console.error(`  ⚠️  No exportable tables found in trace`)
    return xmlPath
  }

  // Export to stdout and write to file ourselves (--output is unreliable with Bun.spawn)
  const exportProc = Bun.spawn([
    'xcrun', 'xctrace', 'export',
    '--input', tracePath,
    '--xpath', xpath,
  ], { stdout: 'pipe', stderr: 'pipe' })

  const xmlContent = await new Response(exportProc.stdout).text()
  const exportExit = await exportProc.exited

  if (exportExit !== 0 || !xmlContent.trim()) {
    const stderr = await new Response(exportProc.stderr).text()
    console.error(`  ⚠️  xctrace export failed: ${stderr.trim()}`)
  } else {
    const { writeFileSync } = await import('fs')
    writeFileSync(xmlPath, xmlContent)
  }

  return xmlPath
}
