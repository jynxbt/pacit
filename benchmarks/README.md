# Pacit Benchmark Harness

Measures Capacitor cold-start performance on real iOS devices.

## Quick Start

```bash
# 1. Build the fixture
cd benchmarks/fixtures/nuxt-mini && bun install && bun run build && cd ../../..

# 2. Run the benchmark
bun run benchmarks/runner/bench.ts --label baseline-stock --runs 10
```

## Device Preparation

1. iPhone 13 connected via USB
2. Airplane Mode ON
3. Force restart, wait 60 seconds
4. Low Power Mode OFF
5. Unlock device

## Metrics

| Metric | Description |
|--------|-------------|
| T1 | SpringBoard tap → first non-white pixel |
| T2 | Process start → DOMContentLoaded |
| T3 | Process start → window.load (PRIMARY) |
| T4 | Process start → first interactive route |
| T5 | Warm start → interactive |
