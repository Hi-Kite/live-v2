<template>
  <NuxtLink v-if="to" :to="to" class="btn" :class="[variantClass, sizeClass, block && 'w-full']">
    <slot />
  </NuxtLink>
  <button
    v-else
    class="btn"
    :class="[variantClass, sizeClass, block && 'w-full']"
    :type="type"
    :disabled="disabled || loading"
  >
    <span
      v-if="loading"
      class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'xs' | 'sm' | 'md';
    type?: 'button' | 'submit' | 'reset';
    to?: RouteLocationRaw;
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    to: undefined,
    loading: false,
    disabled: false,
    block: false,
  },
);

const variantClass = computed(
  () =>
    ({
      primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
      ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    })[props.variant],
);

const sizeClass = computed(
  () =>
    ({
      xs: '!px-2 !py-1 !text-xs',
      sm: '!px-3 !py-1.5 !text-xs',
      md: '',
    })[props.size],
);
</script>
