<template>
  <Teleport :to="overlayTarget">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
        @click.self="close"
      >
        <div
          class="card w-full space-y-4 p-6"
          :class="maxWidthClass"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div v-if="title || $slots.header" class="flex items-start justify-between gap-4">
            <slot name="header">
              <h2 class="text-lg font-bold">{{ title }}</h2>
            </slot>
            <button
              class="btn-ghost -mr-2 -mt-1 !p-1.5 text-soft"
              aria-label="关闭"
              @click="close"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <slot />

          <div v-if="$slots.footer" class="flex justify-end gap-2 pt-1">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// 全屏模式下 body 上的浮层不可见，必须跟随 fullscreenElement
const overlayTarget = useOverlayTarget();

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { title: '', size: 'md' },
);

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const maxWidthClass = computed(
  () => ({ sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' })[props.size],
);

function close() {
  emit('update:modelValue', false);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) close();
}

watch(
  () => props.modelValue,
  (open) => {
    if (import.meta.server) return;
    document.body.style.overflow = open ? 'hidden' : '';
  },
);

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active > div,
  .modal-leave-active > div {
    transition: none;
  }
}
</style>
