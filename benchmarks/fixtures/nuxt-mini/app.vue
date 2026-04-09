<template>
  <div id="app">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { $pacitMark } = useNuxtApp()

$pacitMark('nuxt.beforeMount')

onMounted(() => {
  $pacitMark('nuxt.mounted')
  const router = useRouter()
  router.isReady().then(() => {
    $pacitMark('nuxt.routeReady')
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => $pacitMark('nuxt.interactive'))
    } else {
      setTimeout(() => $pacitMark('nuxt.interactive'), 0)
    }
  })
})
</script>

<style>
html, body {
  background: #0a0a0a;
  color: #e5e5e5;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
</style>
