<template>
  <UiBadge :variant="live ? 'live' : 'offline'" :dot="live" :pulse="live">
    {{ live ? 'LIVE' : '离线' }}
  </UiBadge>
</template>

<script setup lang="ts">
defineProps<{ live: boolean }>();
</script>
