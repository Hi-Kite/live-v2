<template>
  <div class="animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" :class="rounded && 'rounded-full'" aria-hidden="true" />
</template>

<script setup lang="ts">
defineProps<{
  rounded?: boolean;
}>();
</script>
