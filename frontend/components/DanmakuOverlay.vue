<template>
  <div class="danmaku-layer">
    <div
      v-for="d in items"
      :key="d.id"
      class="danmaku-item"
      :style="{
        top: d.top + 'px',
        animationDuration: d.duration + 'ms',
        opacity: visible ? 1 : 0,
      }"
    >
      {{ d.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Danmaku {
  id: number;
  text: string;
  top: number;
  duration: number;
}

const props = withDefaults(
  defineProps<{
    max?: number;
    trackHeight?: number;
    trackCount?: number;
    durationMs?: number;
  }>(),
  {
    max: 80,
    trackHeight: 30,
    trackCount: 8,
    durationMs: 8000,
  },
);

const visible = ref(true);
const items = ref<Danmaku[]>([]);
const counter = ref(0);
const trackCursor = ref(0);

function push(text: string) {
  if (!text || items.value.length >= props.max) return;
  const id = ++counter.value;
  const top = (trackCursor.value % props.trackCount) * props.trackHeight + 8;
  trackCursor.value++;
  const dur = props.durationMs + Math.random() * 2000;
  items.value.push({ id, text, top, duration: dur });
  setTimeout(() => {
    items.value = items.value.filter((d) => d.id !== id);
  }, dur + 200);
}

function toggle(v?: boolean) {
  visible.value = v ?? !visible.value;
}

function clear() {
  items.value = [];
}

defineExpose({ push, toggle, clear, visible });
</script>
