<template>
  <div ref="layerEl" class="danmaku-layer" aria-hidden="true">
    <div
      v-for="d in items"
      :key="d.id"
      :ref="(el) => setItemEl(d.id, el)"
      class="danmaku-item"
      :class="{ 'danmaku-run': d.flyX !== null }"
      :style="{
        top: d.top + 'px',
        animationDuration: d.duration + 'ms',
        opacity: visible ? undefined : 0,
        '--fly-x': d.flyX !== null ? `-${d.flyX}px` : '0px',
      }"
    >
      {{ d.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';

interface Danmaku {
  id: number;
  text: string;
  top: number;
  duration: number;
  /** total fly distance in px (container width + item width), measured after mount */
  flyX: number | null;
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
const layerEl = ref<HTMLElement | null>(null);
const itemEls = new Map<number, HTMLElement>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const reducedMotion = ref(false);

let counter = 0;
let trackCursor = 0;

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
});

function setItemEl(id: number, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) itemEls.set(id, el);
  else itemEls.delete(id);
}

function removeItem(id: number) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
  items.value = items.value.filter((d) => d.id !== id);
}

function push(text: string) {
  // respect prefers-reduced-motion: skip the fly animation entirely
  if (!text || reducedMotion.value || items.value.length >= props.max) return;
  const id = ++counter;
  const top = (trackCursor % props.trackCount) * props.trackHeight + 8;
  trackCursor++;
  const duration = props.durationMs + Math.random() * 2000;
  items.value.push({ id, text, top, duration, flyX: null });

  // the item renders off-screen at left:100%; once mounted, measure it and
  // the container, then start the animation via the per-item CSS variable
  nextTick(() => {
    const el = itemEls.get(id);
    const layer = layerEl.value;
    const item = items.value.find((d) => d.id === id);
    if (!el || !layer || !item) {
      removeItem(id);
      return;
    }
    item.flyX = layer.clientWidth + el.offsetWidth;
    timers.set(
      id,
      setTimeout(() => removeItem(id), duration + 200),
    );
  });
}

function toggle(v?: boolean) {
  visible.value = v ?? !visible.value;
}

function clearAllTimers() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

function clear() {
  clearAllTimers();
  items.value = [];
}

onBeforeUnmount(() => {
  clearAllTimers();
});

defineExpose({ push, toggle, clear, visible });
</script>

<style scoped>
.danmaku-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  overflow: hidden;
  pointer-events: none;
}
.danmaku-item {
  position: absolute;
  left: 100%;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  color: #fff;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.85);
  will-change: transform;
  transform: translateX(0);
  transition: opacity 0.2s ease;
}
.danmaku-run {
  animation-name: danmaku-fly;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes danmaku-fly {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(var(--fly-x, -100vw));
  }
}
</style>
