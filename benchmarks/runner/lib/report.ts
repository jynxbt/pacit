import type { BenchReport, AggregatedMetrics } from './types'
import { writeFileSync, appendFileSync, existsSync } from 'fs'
import path from 'path'

export function generateReport(report: BenchReport, outDir: string): void {
  const reportPath = path.join(outDir, 'report.md')
  const md = renderReport(report)
  writeFileSync(reportPath, md)
  console.log(`📊 Report written to ${reportPath}`)

  // Append to HISTORY.md
  const historyPath = path.resolve(outDir, '../HISTORY.md')
  const historyRow = renderHistoryRow(report)
  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, '# Pacit Benchmark History\n\n' +
      '| Date | SHA | Label | T1 | T2 | T3 | T4 | Runs | Stddev(T3) |\n' +
      '|------|-----|-------|----|----|----|----|----- |-----------|\n' +
      historyRow + '\n')
  } else {
    appendFileSync(historyPath, historyRow + '\n')
  }
}

function renderReport(r: BenchReport): string {
  return `# Pacit Bench Report

**Label:** ${r.label}
**Git SHA:** ${r.gitSha}${r.gitDirty ? ' (dirty)' : ' (clean)'}
**Date:** ${r.date}
**Device:** ${r.device.name} (${r.device.model}), iOS ${r.device.osVersion}
**Runs:** ${r.runs} measured (after ${r.warmup} warmup), ${r.mode} mode

## Primary metric

| | Median | p95 | Min | Stddev |
|---|---:|---:|---:|---:|
| **T3 — process start → window.load** | **${fmtMs(r.t3.median)}** | ${fmtMs(r.t3.p95)} | ${fmtMs(r.t3.min)} | ${fmtMs(r.t3.stddev)} |

## All metrics

| Metric | Description | Median | p95 | Min | Stddev |
|---|---|---:|---:|---:|---:|
| T1 | SpringBoard tap → first pixel | ${fmtMs(r.t1.median)} | ${fmtMs(r.t1.p95)} | ${fmtMs(r.t1.min)} | ${fmtMs(r.t1.stddev)} |
| T2 | process start → DOMContentLoaded | ${fmtMs(r.t2.median)} | ${fmtMs(r.t2.p95)} | ${fmtMs(r.t2.min)} | ${fmtMs(r.t2.stddev)} |
| T3 | process start → window.load | ${fmtMs(r.t3.median)} | ${fmtMs(r.t3.p95)} | ${fmtMs(r.t3.min)} | ${fmtMs(r.t3.stddev)} |
| T4 | process start → interactive | ${fmtMs(r.t4.median)} | ${fmtMs(r.t4.p95)} | ${fmtMs(r.t4.min)} | ${fmtMs(r.t4.stddev)} |
${r.t5 ? `| T5 | warm start → interactive | ${fmtMs(r.t5.median)} | ${fmtMs(r.t5.p95)} | ${fmtMs(r.t5.min)} | ${fmtMs(r.t5.stddev)} |` : ''}

## Variance check

T3 coefficient of variation: ${r.t3.median > 0 ? ((r.t3.stddev / r.t3.median) * 100).toFixed(1) : '?'}%
${r.t3.median > 0 && (r.t3.stddev / r.t3.median) > 0.05 ? '⚠️  **Variance exceeds 5% — results may be unreliable**' : '✅ Within tolerance (< 5%)'}

## Phase breakdown (median run)

| Phase | Duration (ms) | Notes |
|---|---:|---|
${r.phases.map(p => `| ${p.name} | ${fmtMs(p.durationMs)} | ${p.notes} |`).join('\n')}

## Asset requests

| Path | Size | Disk Time |
|---|---:|---:|
${r.assetRequests.map(a => `| ${a.path} | ${(a.sizeBytes / 1024).toFixed(1)} KB | ${fmtMs(a.diskTimeMs)} |`).join('\n')}
`
}

function renderHistoryRow(r: BenchReport): string {
  return `| ${r.date.slice(0, 10)} | ${r.gitSha} | ${r.label} | ${fmtMs(r.t1.median)} | ${fmtMs(r.t2.median)} | ${fmtMs(r.t3.median)} | ${fmtMs(r.t4.median)} | ${r.runs} | ${fmtMs(r.t3.stddev)} |`
}

function fmtMs(ms: number): string {
  if (ms < 0) return 'N/A'
  return `${Math.round(ms)} ms`
}
