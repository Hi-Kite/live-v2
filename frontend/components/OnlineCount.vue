<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    :class="online ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-soft dark:bg-slate-800'"
  >
    <span
      class="h-1.5 w-1.5 rounded-full"
      :class="online ? 'bg-green-500 animate-pulse-dot' : 'bg-slate-400'"
      aria-hidden="true"
    />
    {{ count }} 观众
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ count: number; online?: boolean }>(), { online: false });
</script>
