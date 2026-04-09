import { $ } from 'bun'
import { existsSync } from 'fs'
import path from 'path'

const FIXTURE_DIR = path.resolve(import.meta.dir, '../../fixtures/nuxt-mini')

export async function buildFixture(): Promise<string> {
  const outputDir = path.join(FIXTURE_DIR, '.output/public')

  console.log('📦 Building nuxt-mini fixture...')
  await $`cd ${FIXTURE_DIR} && bun install --frozen-lockfile 2>/dev/null || bun install`
  await $`cd ${FIXTURE_DIR} && bun run build`

  if (!existsSync(path.join(outputDir, 'index.html'))) {
    throw new Error('Fixture build failed: index.html not found in .output/public/')
  }

  // Count chunks
  const files = await $`find ${outputDir} -name '*.js' -o -name '*.css'`.text()
  const chunks = files.trim().split('\n').filter(Boolean)
  console.log(`  ✅ Built ${chunks.length} chunks`)

  return outputDir
}
