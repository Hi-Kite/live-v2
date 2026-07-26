<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="variantClass">
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full bg-current" :class="pulse && 'animate-pulse-dot'" aria-hidden="true" />
    <slot />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'live' | 'offline' | 'neutral' | 'success' | 'danger';
    dot?: boolean;
    pulse?: boolean;
  }>(),
  { variant: 'neutral', dot: false, pulse: false },
);

const variantClass = computed(
  () =>
    ({
      live: 'bg-red-600 text-white',
      offline: 'bg-slate-500 text-white',
      neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
      danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    })[props.variant],
);
</script>
