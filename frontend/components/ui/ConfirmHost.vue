<template>
  <UiModal
    :model-value="state.open"
    :title="state.title || '确认操作'"
    size="sm"
    @update:model-value="settle(false)"
  >
    <p class="text-sm text-soft">{{ state.message }}</p>
    <template #footer>
      <UiButton variant="secondary" @click="settle(false)">
        {{ state.cancelText || '取消' }}
      </UiButton>
      <UiButton :variant="state.danger ? 'danger' : 'primary'" @click="settle(true)">
        {{ state.confirmText || '确定' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
const { state, settle } = useConfirm();
</script>
