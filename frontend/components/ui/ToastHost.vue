<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-xs flex-col gap-2" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="card pointer-events-auto flex items-start gap-2.5 p-3 text-sm shadow-lg"
        >
          <span
            class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
            :class="iconBg(t.type)"
            aria-hidden="true"
          >
            <svg v-if="t.type === 'success'" class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5" /></svg>
            <svg v-else-if="t.type === 'error'" class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            <svg v-else class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 8v5M12 16.5v.5" /></svg>
          </span>
          <p class="min-w-0 flex-1 break-words">{{ t.message }}</p>
          <button class="shrink-0 text-soft hover:text-ink" aria-label="关闭" @click="dismiss(t.id)">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ToastItem } from '~/composables/useToast';

const { toasts, dismiss } = useToast();

function iconBg(type: ToastItem['type']) {
  return { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-brand-600' }[type];
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active,
.toast-move {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: none;
  }
}
</style>
