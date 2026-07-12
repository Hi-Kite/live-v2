<template>
  <span :class="live ? 'badge-live' : 'badge-offline'">
    <span v-if="live" class="h-1.5 w-1.5 rounded-full bg-white animate-pulse-dot" />
    {{ live ? 'LIVE' : '离线' }}
  </span>
</template>

<script setup lang="ts">
defineProps<{ live: boolean }>();
</script>
