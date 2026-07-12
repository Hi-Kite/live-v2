<template>
  <NuxtLink to="/" class="inline-flex items-center gap-2 font-black tracking-tight">
    <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
      <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
    <span class="text-lg">{{ name }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const name = computed(() => config.public.appName as string);
</script>
