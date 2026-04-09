import { $ } from 'bun'

export async function getGitSha(): Promise<string> {
  const result = await $`git rev-parse --short HEAD`.text()
  return result.trim()
}

export async function isGitDirty(): Promise<boolean> {
  const result = await $`git status --porcelain`.text()
  return result.trim().length > 0
}

export function makeResultDir(sha: string, label: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${sha}-${label}-${ts}`
}
