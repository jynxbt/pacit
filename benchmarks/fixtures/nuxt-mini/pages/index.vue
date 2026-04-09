<template>
  <main style="padding: 24px">
    <h1>Pacit Bench</h1>
    <p>Cold-start benchmark fixture — {{ totalSize }} bytes loaded</p>
    <nav>
      <NuxtLink to="/detail/1">Detail 1</NuxtLink>
      <NuxtLink to="/heavy">Heavy route</NuxtLink>
    </nav>
  </main>
</template>

<script setup lang="ts">
// Eagerly import all fake modules so they're in the critical path
// Simulates a production app's ~40 chunks loaded during cold start
import { fakeSolanaBlob } from '~/utils/fake-solana'
import { fakeAnchorBlob } from '~/utils/fake-anchor'
import { fakeTiptapBlob } from '~/utils/fake-tiptap'
import { fakeCanvasBlob } from '~/utils/fake-canvas'
import { fakeLowlightBlob } from '~/utils/fake-lowlight'
import { fakeVueuseBlob } from '~/utils/fake-vueuse'
import { fakePiniaBlob } from '~/utils/fake-pinia'
import { fakeTanstackBlob } from '~/utils/fake-tanstack'
import { fakeHtml2canvasBlob } from '~/utils/fake-html2canvas'
import { fakeNoblecurvesBlob } from '~/utils/fake-noble-curves'
import { fakeIrysBlob } from '~/utils/fake-irys'
import { fakeSimplewebauthnBlob } from '~/utils/fake-simplewebauthn'
import { fakeDrizzleBlob } from '~/utils/fake-drizzle'
import { fakeUpstashBlob } from '~/utils/fake-upstash'

const fakeAuth = useFakeAuth()

// Use all blobs to prevent tree-shaking
const totalSize = fakeSolanaBlob.length + fakeAnchorBlob.length + fakeTiptapBlob.length +
  fakeCanvasBlob.length + fakeLowlightBlob.length + fakeVueuseBlob.length +
  fakePiniaBlob.length + fakeTanstackBlob.length + fakeHtml2canvasBlob.length +
  fakeNoblecurvesBlob.length + fakeIrysBlob.length + fakeSimplewebauthnBlob.length +
  fakeDrizzleBlob.length + fakeUpstashBlob.length
</script>
