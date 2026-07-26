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
      primary: 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md shadow-brand-600/25 hover:from-brand-600 hover:to-brand-700 hover:shadow-lg hover:shadow-brand-600/30',
      secondary: 'border border-line bg-surface text-ink shadow-sm hover:border-soft/40 hover:bg-page',
      danger: 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-md shadow-red-600/25 hover:from-red-600 hover:to-red-700',
      ghost: 'text-soft hover:bg-ink/5 hover:text-ink',
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
