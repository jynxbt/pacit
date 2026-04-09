import type { Event, AggregatedMetrics } from './types'

export interface RunMetrics {
  t1: number       // first frame (native)
  t2: number       // didFinishLaunching complete (native)
  t3: number       // foreground-active (native lifecycle end)
  t4: number       // nuxt.interactive or fallback to t1
  windowLoad: number  // window.load from signpost — the REAL web content metric
}

export function computeMetrics(
  lifecycleEvents: Event[],
  jsMarks?: Record<string, number>
): RunMetrics {
  const empty: RunMetrics = { t1: -1, t2: -1, t3: -1, t4: -1, windowLoad: -1 }
  if (lifecycleEvents.length === 0 && (!jsMarks || Object.keys(jsMarks).length === 0)) return empty

  // Native lifecycle metrics from xctrace life-cycle-period
  let t1 = -1, t2 = -1, t3 = -1

  if (lifecycleEvents.length > 0) {
    const t0 = lifecycleEvents[0].tStart
    const nsToMs = (ns: number) => (ns - t0) / 1_000_000

    const find = (pattern: string) => lifecycleEvents.find(e => e.name.includes(pattern))
    const findEnd = (pattern: string) => {
      const ev = find(pattern)
      return ev && ev.tEnd != null ? nsToMs(ev.tEnd) : -1
    }

    t1 = findEnd('Initial Frame Rendering')
    t2 = findEnd('didFinishLaunchingWithOptions')

    const foregroundActive = find('Foreground - Active')
    t3 = foregroundActive ? nsToMs(foregroundActive.tStart) : -1
  }

  // JS marks from pasteboard (ms since process start, set by BenchBridgeViewController)
  const windowLoad = jsMarks?.['window.load'] ?? jsMarks?.['dom.contentLoaded'] ?? -1
  const nuxtInteractive = jsMarks?.['nuxt.interactive'] ?? -1
  const t4 = nuxtInteractive >= 0 ? nuxtInteractive : t1

  return { t1, t2, t3, t4, windowLoad }
}

export function aggregate(values: number[]): AggregatedMetrics {
  const valid = values.filter(v => v >= 0).sort((a, b) => a - b)
  if (valid.length === 0) {
    return { median: -1, p50: -1, p95: -1, min: -1, max: -1, stddev: -1, values: [] }
  }

  const median = percentile(valid, 50)
  const p50 = median
  const p95 = percentile(valid, 95)
  const min = valid[0]
  const max = valid[valid.length - 1]
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length
  const stddev = Math.sqrt(valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / valid.length)

  return { median, p50, p95, min, max, stddev, values: valid }
}

function percentile(sorted: number[], pct: number): number {
  const idx = (pct / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}
