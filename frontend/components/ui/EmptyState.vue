<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <div v-if="$slots.icon" class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-soft dark:bg-slate-800">
      <slot name="icon" />
    </div>
    <div>
      <p class="text-sm font-medium">{{ title }}</p>
      <p v-if="description" class="mt-1 text-sm text-soft">{{ description }}</p>
    </div>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>
