import { $ } from 'bun'
import path from 'path'

const HOST_DIR = path.resolve(import.meta.dir, '../../ios/BenchHost/BenchHost')
const HOST_PUBLIC = path.join(HOST_DIR, 'public')

export async function copyWebDir(fixtureOutput: string): Promise<void> {
  console.log('📋 Copying fixture output to BenchHost/public/...')
  await $`find ${HOST_PUBLIC} -mindepth 1 -not -name '.gitkeep' -delete 2>/dev/null; true`
  await $`cp -R ${fixtureOutput}/ ${HOST_PUBLIC}/`
  console.log('  ✅ WebDir copied')
}

export async function packAssets(fixtureOutput: string): Promise<void> {
  const packScript = path.resolve(import.meta.dir, '../pack-assets.ts')
  const pakPath = path.join(HOST_DIR, 'pacit-assets.pak')

  console.log('📦 Packing assets into .pak archive...')
  await $`bun run ${packScript} ${fixtureOutput} ${pakPath}`
}
