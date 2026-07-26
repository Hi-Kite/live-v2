<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">多路直播</h1>
      <div v-if="loading" class="flex flex-wrap gap-2">
        <UiSkeleton v-for="i in 3" :key="i" class="h-8 w-24" />
      </div>
      <div v-else-if="streams.length" class="flex flex-wrap gap-2">
        <UiButton
          v-for="s in streams"
          :key="s.id"
          size="sm"
          :variant="selected.includes(s.id) ? 'primary' : 'secondary'"
          :disabled="!selected.includes(s.id) && selected.length >= 4"
          @click="toggle(s.id)"
        >
          {{ s.title }}
          <LiveBadge :live="s.liveStatus" />
        </UiButton>
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div v-for="i in 2" :key="i" class="card overflow-hidden">
        <UiSkeleton class="aspect-video w-full !rounded-none" />
      </div>
    </div>

    <!-- load error -->
    <div v-else-if="loadError" class="card">
      <UiEmptyState title="加载失败" :description="loadError">
        <template #action>
          <UiButton size="sm" @click="load">重试</UiButton>
        </template>
      </UiEmptyState>
    </div>

    <!-- empty list -->
    <div v-else-if="streams.length === 0" class="card">
      <UiEmptyState title="暂无直播间" description="还没有可观看的直播间，请稍后再来">
        <template #icon>
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M8 7l4-4 4 4" />
          </svg>
        </template>
        <template #action>
          <UiButton to="/" variant="secondary" size="sm">返回首页</UiButton>
        </template>
      </UiEmptyState>
    </div>

    <!-- nothing selected -->
    <div v-else-if="selectedStreams.length === 0" class="card">
      <UiEmptyState
        title="请选择直播间"
        description="点击上方按钮选择要同时观看的直播间（最多 4 路）"
      />
    </div>

    <!-- grid -->
    <div v-else class="grid gap-4" :class="gridClass">
      <div v-for="s in selectedStreams" :key="s.id" class="card overflow-hidden">
        <StreamTile :stream="s" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StreamPublic } from '~/composables/useApi';

const streamsApi = useStreams();
const streams = ref<StreamPublic[]>([]);
const selected = ref<number[]>([]);
const loading = ref(true);
const loadError = ref('');

const selectedStreams = computed(() =>
  selected.value
    .map((id) => streams.value.find((s) => s.id === id))
    .filter((s): s is StreamPublic => !!s),
);

const gridClass = computed(() => {
  const n = selectedStreams.value.length;
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (n === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
});

function toggle(id: number) {
  if (selected.value.includes(id)) {
    selected.value = selected.value.filter((x) => x !== id);
  } else if (selected.value.length < 4) {
    selected.value = [...selected.value, id];
  }
}

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    streams.value = await streamsApi.list();
    // auto-pick live streams (max 4)
    if (selected.value.length === 0) {
      const live = streams.value.filter((s) => s.liveStatus || s.actualLive);
      selected.value = (live.length ? live : streams.value.slice(0, 2))
        .slice(0, 4)
        .map((s) => s.id);
    }
  } catch (e) {
    loadError.value = apiErrorMessage(e, '加载直播间列表失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

useHead({ title: '多路直播 — LIVE' });
</script>
