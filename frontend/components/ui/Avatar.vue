<template>
  <span
    class="flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white"
    :class="sizeClass"
    aria-hidden="true"
  >
    {{ initial }}
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    name: string;
    size?: 'sm' | 'md';
  }>(),
  { size: 'sm' },
);

const initial = computed(() => (props.name || '?').charAt(0).toUpperCase());
const sizeClass = computed(() => ({ sm: 'h-6 w-6 text-xs', md: 'h-9 w-9 text-sm' })[props.size]);
</script>
