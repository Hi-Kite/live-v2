<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">多路直播</h1>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in streams"
          :key="s.id"
          class="btn text-xs"
          :class="selected.includes(s.id) ? 'bg-brand-600 text-white' : 'btn-secondary'"
          :disabled="!selected.includes(s.id) && selected.length >= 4"
          @click="toggle(s.id)"
        >
          {{ s.title }}
          <LiveBadge :live="s.liveStatus" />
        </button>
      </div>
    </div>

    <div
      class="grid gap-4"
      :class="gridClass"
    >
      <div v-for="id in selected" :key="id" class="card overflow-hidden">
        <StreamTile :stream="byId(id)" @send-danmaku="onDanmaku" />
      </div>
      <div v-if="selected.length === 0" class="card col-span-full p-12 text-center text-sm text-slate-400">
        请选择至少一个直播间
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StreamPublic } from '~/composables/useApi';

const streamsApi = useStreams();
const streams = ref<StreamPublic[]>([]);
const selected = ref<number[]>([]);
const danmakuQueue: string[] = [];

const byId = (id: number) => streams.value.find((s) => s.id === id)!;

const gridClass = computed(() => {
  const n = selected.value.length;
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (n === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-2 lg:grid-cols-2 xl:grid-cols-4';
});

function toggle(id: number) {
  if (selected.value.includes(id)) {
    selected.value = selected.value.filter((x) => x !== id);
  } else if (selected.value.length < 4) {
    selected.value.push(id);
  }
}

function onDanmaku(text: string) {
  danmakuQueue.push(text);
  if (danmakuQueue.length > 50) danmakuQueue.shift();
}

onMounted(async () => {
  streams.value = await streamsApi.list();
  // auto-pick live streams (max 4)
  const live = streams.value.filter((s) => s.liveStatus || s.actualLive);
  selected.value = (live.length ? live : streams.value.slice(0, 2)).slice(0, 4).map((s) => s.id);
});

useHead({ title: '多路直播 — LIVE' });
</script>
