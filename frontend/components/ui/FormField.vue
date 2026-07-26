<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="fieldId" class="block text-sm font-medium">{{ label }}</label>
    <slot :id="fieldId" />
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-soft">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label?: string;
  error?: string;
  hint?: string;
  for?: string;
}>();

const uid = useId();
const fieldId = computed(() => props.for || `field-${uid}`);
</script>
