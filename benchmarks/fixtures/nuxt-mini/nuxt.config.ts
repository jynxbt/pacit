export default defineNuxtConfig({
  ssr: false,
  nitro: { preset: 'static' },
  app: {
    head: {
      htmlAttrs: { style: 'background:#0a0a0a' },
      bodyAttrs: { style: 'background:#0a0a0a;color:#e5e5e5;margin:0' },
      script: [{
        innerHTML: 'window.__pacitMark&&window.__pacitMark("nuxt.entry");',
        tagPosition: 'head',
      }],
    },
  },
  vite: {
    build: {
      target: ['safari16'],
      cssCodeSplit: true,
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            solana: ['~/utils/fake-solana'],
            anchor: ['~/utils/fake-anchor'],
            tiptap: ['~/utils/fake-tiptap'],
            canvas: ['~/utils/fake-canvas'],
            lowlight: ['~/utils/fake-lowlight'],
            vueuse: ['~/utils/fake-vueuse'],
            pinia: ['~/utils/fake-pinia'],
            tanstack: ['~/utils/fake-tanstack'],
            html2canvas: ['~/utils/fake-html2canvas'],
            noblecurves: ['~/utils/fake-noble-curves'],
            irys: ['~/utils/fake-irys'],
            simplewebauthn: ['~/utils/fake-simplewebauthn'],
            drizzle: ['~/utils/fake-drizzle'],
            upstash: ['~/utils/fake-upstash'],
          },
        },
      },
    },
  },
})
