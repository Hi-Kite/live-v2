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
      live: 'bg-gradient-to-b from-red-500 to-rose-600 text-white shadow-glow',
      offline: 'bg-slate-500/15 text-soft',
      neutral: 'bg-ink/5 text-soft',
      success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
      danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    })[props.variant],
);
</script>
