<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm shadow-sm transition-all hover:border-rose-300 hover:text-rose-500 active:scale-95 dark:hover:border-rose-500/50"
    :aria-label="`给主播点赞（当前 ${count} 个赞）`"
    @click="like"
  >
    <svg
      class="h-4 w-4 text-rose-500"
      :class="popped && 'like-pop'"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
    <span class="font-medium tabular-nums">{{ formatted }}</span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  streamId: number;
  count: number;
}>();

const socket = useSocket();
const popped = ref(false);
let popTimer: ReturnType<typeof setTimeout> | undefined;

const formatted = computed(() =>
  props.count >= 10000 ? `${(props.count / 10000).toFixed(1)}万` : String(props.count),
);

function like() {
  socket.emit('like', { streamId: props.streamId });
  popped.value = false;
  // 重新触发动画
  requestAnimationFrame(() => {
    popped.value = true;
    clearTimeout(popTimer);
    popTimer = setTimeout(() => (popped.value = false), 300);
  });
}

onBeforeUnmount(() => clearTimeout(popTimer));
</script>

<style scoped>
.like-pop {
  animation: like-pop 0.3s ease;
}
@keyframes like-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.45); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .like-pop { animation: none; }
}
</style>
