import { $ } from 'bun'

export interface ConnectedDevice {
  udid: string
  name: string
  model: string
  osVersion: string
}

export async function listDevices(): Promise<ConnectedDevice[]> {
  try {
    const output = await $`xcrun devicectl list devices --json-output /dev/stdout 2>/dev/null`.text()
    const json = JSON.parse(output)
    const devices: ConnectedDevice[] = []
    for (const device of json.result?.devices ?? []) {
      if (device.connectionProperties?.transportType === 'wired') {
        devices.push({
          udid: device.hardwareProperties?.udid ?? device.identifier,
          name: device.deviceProperties?.name ?? 'Unknown',
          model: device.hardwareProperties?.marketingName ?? device.hardwareProperties?.productType ?? 'Unknown',
          osVersion: device.deviceProperties?.osVersionNumber ?? 'Unknown',
        })
      }
    }
    return devices
  } catch {
    // Fallback: use xctrace list devices (works on more Xcode versions)
    try {
      const output = await $`xcrun xctrace list devices 2>/dev/null`.text()
      const devices: ConnectedDevice[] = []
      let inDevicesSection = false
      for (const line of output.split('\n')) {
        if (line.startsWith('== Devices ==')) { inDevicesSection = true; continue }
        if (line.startsWith('== Devices Offline ==') || line.startsWith('== Simulators ==')) { inDevicesSection = false; continue }
        if (!inDevicesSection || line.trim() === '') continue
        // Format: "Name (OS Version) (UDID)"
        const match = line.match(/^(.+?)\s+\((\d+\.\d+[^)]*)\)\s+\(([A-F0-9-]+)\)$/i)
        if (match) {
          devices.push({
            udid: match[3],
            name: match[1].trim(),
            model: 'Unknown',
            osVersion: match[2],
          })
        }
      }
      if (devices.length > 0) return devices
    } catch { /* fall through */ }

    console.error('⚠️  No device detection method available. Is Xcode installed?')
    return []
  }
}

export async function installApp(deviceUdid: string, appPath: string): Promise<void> {
  console.log(`📲 Installing to device ${deviceUdid}...`)
  const proc = Bun.spawn([
    'xcrun', 'devicectl', 'device', 'install', 'app',
    '--device', deviceUdid, appPath,
  ], { stdout: 'pipe', stderr: 'pipe' })

  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    console.error(`  ❌ Install failed: ${stderr.trim().split('\n')[0]}`)
    throw new Error('devicectl install failed')
  }
  console.log('  ✅ Installed')
}

export async function launchApp(deviceUdid: string, bundleId: string): Promise<void> {
  await $`xcrun devicectl device process launch --device ${deviceUdid} ${bundleId}`
}

export async function terminateApp(deviceUdid: string, bundleId: string): Promise<void> {
  try {
    await $`xcrun devicectl device process terminate --device ${deviceUdid} --pid-by-bundle ${bundleId} 2>/dev/null`
  } catch {
    // App may not be running, that's fine
  }
}

export async function isSimulator(udid: string): Promise<boolean> {
  try {
    const output = await $`xcrun simctl list devices --json`.text()
    const json = JSON.parse(output)
    for (const runtime of Object.values(json.devices) as any[]) {
      for (const device of runtime) {
        if (device.udid === udid) return true
      }
    }
  } catch { /* not a simulator */ }
  return false
}

export async function readBenchMarks(deviceUdid: string): Promise<Record<string, number>> {
  const marks: Record<string, number> = {}
  const dest = `/tmp/pacit-bench-marks-${Date.now()}.txt`

  // Retry up to 5 times (file may not be written yet)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const proc = Bun.spawn([
        'xcrun', 'devicectl', 'device', 'copy', 'from',
        '--device', deviceUdid,
        '--domain-type', 'appDataContainer',
        '--domain-identifier', 'xyz.pacit.benchhost',
        '--source', 'Documents/bench-marks.txt',
        '--destination', dest,
      ], { stdout: 'pipe', stderr: 'pipe' })

      const exitCode = await proc.exited
      if (exitCode !== 0) {
        if (attempt < 4) { await Bun.sleep(2000); continue }
        break
      }

      const content = await Bun.file(dest).text()
      for (const line of content.split('\n')) {
        const [name, ms] = line.split('=')
        if (name && ms) {
          marks[name.trim()] = parseInt(ms.trim(), 10)
        }
      }
      break // success
    } catch {
      if (attempt < 4) { await Bun.sleep(2000); continue }
    }
  }

  try { const { unlinkSync } = await import('fs'); unlinkSync(dest) } catch {}
  return marks
}

export async function parseDeviceLogs(deviceUdid: string): Promise<Record<string, number>> {
  const marks: Record<string, number> = {}
  const logArchive = `/tmp/pacit-bench-${Date.now()}.logarchive`

  try {
    // Collect recent logs from the iOS device
    const collectProc = Bun.spawn([
      '/usr/bin/log', 'collect',
      '--device-udid', deviceUdid,
      '--last', '1m',
      '--output', logArchive,
    ], { stdout: 'pipe', stderr: 'pipe' })
    await collectProc.exited

    // Search the collected archive for our marks
    const showProc = Bun.spawn([
      '/usr/bin/log', 'show', logArchive,
      '--predicate', 'eventMessage CONTAINS "PACIT_BENCH_MARK"',
      '--style', 'compact',
    ], { stdout: 'pipe', stderr: 'pipe' })

    const output = await new Response(showProc.stdout).text()
    await showProc.exited

    // Parse PACIT_BENCH_MARK lines: "PACIT_BENCH_MARK: window.load 523ms"
    for (const line of output.split('\n')) {
      const match = line.match(/PACIT_BENCH_MARK:\s+(\S+)\s+(\d+)ms/)
      if (match) {
        marks[match[1]] = parseInt(match[2], 10)
      }
    }
  } catch (err) {
    // Log collection failed — device logs unavailable
  } finally {
    // Clean up logarchive
    try {
      const { rmSync } = await import('fs')
      rmSync(logArchive, { recursive: true, force: true })
    } catch { /* ignore */ }
  }

  return marks
}
