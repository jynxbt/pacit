import { $ } from 'bun'
import { cpSync, existsSync, rmSync } from 'fs'
import path from 'path'

const WORKSPACE_DIR = path.resolve(import.meta.dir, '../../ios/BenchHost')
const TEAM_ID = 'WMBTKH6H3F'

export async function buildBenchHost(opts: {
  scheme: string
  device: string
  teamId?: string
}): Promise<string> {
  console.log(`🔨 Building BenchHost (scheme: ${opts.scheme})...`)

  const team = opts.teamId || TEAM_ID
  const derivedData = path.join(WORKSPACE_DIR, 'build')

  const proc = Bun.spawn([
    'xcodebuild',
    '-workspace', path.join(WORKSPACE_DIR, 'BenchHost.xcworkspace'),
    '-scheme', opts.scheme,
    '-configuration', 'Release',
    '-destination', `platform=iOS,id=${opts.device}`,
    '-derivedDataPath', derivedData,
    `DEVELOPMENT_TEAM=${team}`,
    'CODE_SIGN_STYLE=Automatic',
    'clean', 'build',
  ], { stdout: 'pipe', stderr: 'pipe', cwd: WORKSPACE_DIR })

  const stdout = await new Response(proc.stdout).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    // Find the actual error in build output
    const errorLines = (stdout + stderr).split('\n').filter(l => l.includes('error:'))
    throw new Error(`xcodebuild failed (exit ${exitCode}):\n${errorLines.join('\n')}`)
  }

  const appPath = path.join(derivedData, 'Build/Products/Release-iphoneos/BenchHost.app')
  if (!existsSync(appPath)) {
    throw new Error(`Built app not found at ${appPath}`)
  }

  // Copy to /tmp to avoid devicectl sandbox issues with deep paths
  const tmpApp = '/tmp/BenchHost.app'
  rmSync(tmpApp, { recursive: true, force: true })
  cpSync(appPath, tmpApp, { recursive: true })

  console.log(`  ✅ Built and staged at ${tmpApp}`)
  return tmpApp
}

export async function podInstall(): Promise<void> {
  console.log('🔧 Running pod install...')
  await $`cd ${WORKSPACE_DIR} && pod install`
  console.log('  ✅ Pods installed')
}
