<template>
  <div class="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
    <div class="text-center">
      <h1 class="text-2xl font-bold">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-soft">{{ subtitle }}</p>
    </div>

    <div class="card space-y-4 p-6">
      <slot />
    </div>

    <div v-if="$slots.footer" class="text-center text-sm text-soft">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>
