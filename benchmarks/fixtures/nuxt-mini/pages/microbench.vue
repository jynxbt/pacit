<template>
  <main style="padding: 24px">
    <h1>Micro Benchmark</h1>
    <p v-if="running">Running... {{ progress }}</p>
    <div v-else-if="results">
      <h2>Sequential Echo ({{ results.sequential.count }} calls)</h2>
      <p>Median: <strong>{{ results.sequential.median.toFixed(2) }} ms</strong></p>
      <p>p95: {{ results.sequential.p95.toFixed(2) }} ms | Min: {{ results.sequential.min.toFixed(2) }} ms | Max: {{ results.sequential.max.toFixed(2) }} ms</p>

      <h2>Concurrent Echo ({{ results.concurrent.count }} calls via Promise.all)</h2>
      <p>Total: <strong>{{ results.concurrent.total.toFixed(2) }} ms</strong> | Per-call: {{ results.concurrent.perCall.toFixed(2) }} ms</p>

      <h2>Burst Echo ({{ results.burst.count }} rapid-fire calls)</h2>
      <p>Total: <strong>{{ results.burst.total.toFixed(2) }} ms</strong> | Per-call: {{ results.burst.perCall.toFixed(2) }} ms</p>
    </div>
    <p v-else>Waiting to start...</p>
  </main>
</template>

<script setup lang="ts">
const running = ref(true)
const progress = ref('')
const results = ref<any>(null)

function percentile(sorted: number[], pct: number): number {
  const idx = (pct / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

// Direct echo via pacitPerf WKScriptMessageHandler — bypasses Capacitor bridge
const pendingEchos = new Map<string, (value: string) => void>()
let echoCounter = 0

function setupEchoHandler() {
  ;(window as any).__pacitEchoResolve = (id: string, value: string) => {
    const resolve = pendingEchos.get(id)
    if (resolve) {
      pendingEchos.delete(id)
      resolve(value)
    }
  }
}

function echo(value: string): Promise<string> {
  return new Promise((resolve) => {
    const id = `e${++echoCounter}`
    pendingEchos.set(id, resolve)
    ;(window as any).webkit.messageHandlers.pacitPerf.postMessage({
      type: 'echo',
      id,
      value,
    })
  })
}

async function runBenchmark() {
  setupEchoHandler()

  const N_SEQ = 100
  const N_CONCURRENT = 100
  const N_BURST = 50

  // Warmup
  progress.value = 'Warming up...'
  for (let i = 0; i < 10; i++) {
    await echo('warmup')
  }

  // Sequential
  progress.value = `Sequential 0/${N_SEQ}`
  const seqTimes: number[] = []
  for (let i = 0; i < N_SEQ; i++) {
    const start = performance.now()
    await echo(`seq-${i}`)
    seqTimes.push(performance.now() - start)
    if (i % 20 === 0) progress.value = `Sequential ${i}/${N_SEQ}`
  }

  // Concurrent
  progress.value = `Concurrent ${N_CONCURRENT} calls...`
  const concStart = performance.now()
  await Promise.all(
    Array.from({ length: N_CONCURRENT }, (_, i) => echo(`conc-${i}`))
  )
  const concTotal = performance.now() - concStart

  // Burst
  progress.value = `Burst ${N_BURST} calls...`
  const burstStart = performance.now()
  const burstPromises: Promise<string>[] = []
  for (let i = 0; i < N_BURST; i++) {
    burstPromises.push(echo(`burst-${i}`))
  }
  await Promise.all(burstPromises)
  const burstTotal = performance.now() - burstStart

  running.value = false
  const sorted = [...seqTimes].sort((a, b) => a - b)
  results.value = {
    sequential: {
      count: N_SEQ,
      median: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      min: sorted[0],
      max: sorted[sorted.length - 1],
    },
    concurrent: { count: N_CONCURRENT, total: concTotal, perCall: concTotal / N_CONCURRENT },
    burst: { count: N_BURST, total: burstTotal, perCall: burstTotal / N_BURST },
  }

  // Report via pacitMark
  const summary = [
    `microbench.seq.median=${results.value.sequential.median.toFixed(2)}`,
    `microbench.seq.p95=${results.value.sequential.p95.toFixed(2)}`,
    `microbench.seq.min=${results.value.sequential.min.toFixed(2)}`,
    `microbench.conc.total=${concTotal.toFixed(2)}`,
    `microbench.conc.perCall=${(concTotal / N_CONCURRENT).toFixed(2)}`,
    `microbench.burst.total=${burstTotal.toFixed(2)}`,
    `microbench.burst.perCall=${(burstTotal / N_BURST).toFixed(2)}`,
  ].join('|')

  ;(window as any).__pacitMark(`microbench.done:${summary}`)
}

onMounted(() => {
  setTimeout(runBenchmark, 500)
})
</script>
