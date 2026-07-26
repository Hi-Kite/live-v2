<template>
  <input
    :id="id"
    v-model="model"
    class="input"
    :class="invalid && '!border-red-500 focus:!ring-red-500/20'"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{
  id?: string;
  invalid?: boolean;
}>();

const model = defineModel<string>({ default: '' });
</script>
