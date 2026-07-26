<template>
  <div ref="layerEl" class="danmaku-layer" :style="{ fontSize }" aria-hidden="true">
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

const { fontSize } = useDanmakuSize();
/** 轨道高度跟随字号（rem→px，×1.7 行距），避免大字号轨道重叠 */
const trackHeight = computed(() =>
  Math.ceil(parseFloat(fontSize.value) * 16 * 1.7) || props.trackHeight,
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
  // 可用轨道数按容器实际高度收缩：小尺寸播放器 + 大字号时不把弹幕排到可视区外
  const layerH = layerEl.value?.clientHeight ?? 0;
  const usableTracks = layerH
    ? Math.max(1, Math.min(props.trackCount, Math.floor((layerH - 8) / trackHeight.value)))
    : props.trackCount;
  const top = (trackCursor % usableTracks) * trackHeight.value + 8;
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
  font-size: 1em; /* 跟随图层字号（useDanmakuSize） */
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.4;
  color: #fff;
  text-shadow:
    0 0 1px rgb(0 0 0 / 0.6),
    0 2px 6px rgb(0 0 0 / 0.8);
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
