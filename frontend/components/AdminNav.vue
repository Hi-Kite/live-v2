<template>
  <nav class="flex flex-wrap items-center gap-1 border-b border-line" aria-label="后台导航">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-soft transition-colors hover:text-ink"
      :class="isActive(item.to) && '!border-brand-600 !text-brand-600'"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute();

const items = [
  { to: '/admin', label: '概览' },
  { to: '/admin/streams', label: '直播间' },
  { to: '/admin/users', label: '用户' },
  { to: '/admin/invite-codes', label: '邀请码' },
];

function isActive(to: string) {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to);
}
</script>
