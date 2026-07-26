<template>
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-line text-left text-xs uppercase text-soft">
          <tr><slot name="head" /></tr>
        </thead>
        <tbody class="divide-y divide-line">
          <slot />
        </tbody>
      </table>
    </div>
    <UiEmptyState v-if="empty" :title="emptyText || '暂无数据'" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  empty?: boolean;
  emptyText?: string;
}>();
</script>

<style scoped>
table :deep(th) {
  padding: 0.75rem 1rem;
  font-weight: 600;
  white-space: nowrap;
}
table :deep(td) {
  padding: 0.75rem 1rem;
}
</style>
