<template>
  <footer class="border-t py-6 text-center text-xs text-slate-500 dark:text-slate-400" :style="{ borderColor: 'var(--border)' }">
    <div class="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
      <p>© {{ year }} LIVE · 现代化直播平台</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear();
</script>
