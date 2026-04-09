export interface Event {
  name: string
  kind: 'interval' | 'event'
  tStart: number  // nanoseconds since process start (normalized to app.classLoad)
  tEnd?: number
  duration?: number
  meta?: Record<string, string>
}

export interface Metrics {
  t1: number[]  // SpringBoard tap → first non-white pixel (ms)
  t2: number[]  // process start → DOMContentLoaded (ms)
  t3: number[]  // process start → window.load (ms) — PRIMARY
  t4: number[]  // process start → first interactive route (ms)
  t5: number[]  // warm start → interactive (ms)
}

export interface RunResult {
  runIndex: number
  events: Event[]
  metrics: {
    t1: number
    t2: number
    t3: number
    t4: number
    windowLoad: number
  }
}

export interface BenchConfig {
  label: string
  runs: number
  warmup: number
  mode: 'cold' | 'warm'
  device?: string
  scheme: string
  skipBuild: boolean
  skipFixtureBuild: boolean
  allowDirty: boolean
  dryRun: boolean
}

export interface DeviceInfo {
  udid: string
  name: string
  model: string
  osVersion: string
}

export interface AggregatedMetrics {
  median: number
  p50: number
  p95: number
  min: number
  max: number
  stddev: number
  values: number[]
}

export interface BenchReport {
  label: string
  gitSha: string
  gitDirty: boolean
  date: string
  device: DeviceInfo
  runs: number
  warmup: number
  mode: string
  t1: AggregatedMetrics
  t2: AggregatedMetrics
  t3: AggregatedMetrics
  t4: AggregatedMetrics
  t5?: AggregatedMetrics
  phases: { name: string; startMs: number; durationMs: number; notes: string }[]
  assetRequests: { path: string; sizeBytes: number; diskTimeMs: number }[]
}
