<template>
  <main style="padding: 24px">
    <h1>Heavy Route</h1>
    <p>Loaded {{ blobLength }} bytes of fake-solana</p>
    <NuxtLink to="/">Back</NuxtLink>
  </main>
</template>

<script setup lang="ts">
const solana = await import('~/utils/fake-solana')
const blobLength = solana.fakeSolanaBlob.length
</script>
