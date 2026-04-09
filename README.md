<br />
<div align="center">
  <h1>Pacit</h1>
  <p><strong>Faster Capacitor for iOS</strong></p>
  <p>A performance-focused fork of <a href="https://github.com/ionic-team/capacitor">Capacitor 8.3.0</a> optimized for Nuxt/Vue SPA cold starts on iOS.</p>
</div>
<br />

---

## What is Pacit?

Pacit is a fork of [Capacitor](https://capacitorjs.com) that makes iOS cold starts significantly faster for chunked JavaScript SPAs (Nuxt, Vue, etc.). Stock Capacitor has three performance bottlenecks that Pacit addresses:

1. **Synchronous per-chunk disk reads** — `WebViewAssetHandler` calls `Data(contentsOf:)` for every JS/CSS chunk on the URL-scheme handler thread. For a 40-chunk Nuxt build, that's 40+ blocking filesystem syscalls in the critical path.

2. **`Cache-Control: no-cache` on all bundled assets** — defeats WebKit's in-memory JS bytecode cache, forcing re-parsing on every launch.

3. **Synchronous plugin JSON loading** — `CapacitorBridge.init` reads and decodes `capacitor.config.json` on the main thread before the WebView can start loading.

## Optimizations

| Phase | What | Impact |
|-------|------|--------|
| **B** | `Cache-Control: immutable` + ETag + 304 handling | Enables WebKit bytecode cache for warm starts |
| **A** | Bundled asset archive (`.pak`) — single mmap'd file, O(1) lookup | Eliminates per-chunk disk I/O on cold start |
| **C** | Bridge init reorder + WKWebView preheat | Saves ~30-50 ms of native Scene Creation |
| **D** | Build-time plugin registry | Skips runtime JSON parse (~5 ms) |

  ## Measured Baseline (iPhone 16, iOS 26.4)

```
T3 native (process → foreground):  496 ms median
  - Process Creation (OS):         355 ms (75%, untouchable)
  - App-controllable:              ~116 ms
window.load (web content):         157 ms median
```

Benchmark harness included at `benchmarks/` — run your own:

```bash
bun run benchmarks/runner/bench.ts --label my-test --runs 10 --allow-dirty
```

## Getting Started

Pacit is a drop-in replacement for `@capacitor/ios`. Point your Podfile or SPM package at this repo instead of upstream Capacitor:

```ruby
# Podfile
pod 'Capacitor', :path => 'path/to/pacit/ios'
pod 'CapacitorCordova', :path => 'path/to/pacit/ios'
```

Everything else works the same as stock Capacitor — same CLI, same plugins, same config.

### Asset Archive (optional)

To enable the `.pak` mmap'd asset archive for maximum cold-start performance:

```bash
# Pack your web assets into a single archive
bun run pacit/benchmarks/runner/pack-assets.ts .output/public ios/App/App/pacit-assets.pak

# Add pacit-assets.pak as a bundle resource in your Xcode project
```

The archive is loaded automatically when present. Falls back to standard per-file reads when absent.

## Benchmarking

Pacit includes a full benchmark harness for measuring cold-start performance on real iOS devices:

```bash
cd pacit

# Build the test fixture
cd benchmarks/fixtures/nuxt-mini && bun install && bun run build && cd ../../..

# Run benchmark (requires iPhone connected via USB)
bun run benchmarks/runner/bench.ts --label baseline --runs 10 --allow-dirty
```

Results are saved to `benchmarks/results/` with per-run traces and a markdown report.

## Compatibility

- iOS 15.0+
- Capacitor 8.3.0 API compatible
- All Capacitor plugins work unchanged
- CocoaPods and SPM supported

## Upstream

Forked from [ionic-team/capacitor](https://github.com/ionic-team/capacitor) at v8.3.0. Optimizations are isolated to new files or small gated diffs to minimize merge conflicts on upstream pulls.

## License

[MIT](./LICENSE) — same as Capacitor.
