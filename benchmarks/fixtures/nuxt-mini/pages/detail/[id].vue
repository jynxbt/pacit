<template>
  <main style="padding: 24px">
    <h1>Detail {{ $route.params.id }}</h1>
    <NuxtLink to="/">Back</NuxtLink>
  </main>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
