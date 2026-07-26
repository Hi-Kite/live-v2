<template>
  <div class="relative aspect-video w-full overflow-hidden bg-black">
    <ArtplayerView
      v-if="isLive && detail"
      :key="stream.id + '-' + (stream.actualLive ? 'live' : 'waiting')"
      :src="detail.playback.flv"
      kind="flv"
      :actual-live="stream.actualLive"
    />

    <div
      v-else-if="isLive && pending"
      class="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900"
    >
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
        aria-hidden="true"
      />
      <p class="text-xs text-slate-400">正在获取播放地址…</p>
    </div>

    <div
      v-else-if="isLive && error"
      class="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900 px-4 text-center"
    >
      <p class="text-xs text-slate-300">{{ error }}</p>
      <UiButton size="sm" variant="secondary" @click="loadDetail">重试</UiButton>
    </div>

    <div
      v-else
      class="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900 text-slate-400"
    >
      <svg viewBox="0 0 24 24" class="h-10 w-10 text-slate-600" fill="currentColor" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
      <p class="text-sm">未开播</p>
      <p class="text-xs text-slate-500">开播后可在此观看</p>
    </div>

    <div
      class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-2"
    >
      <span class="truncate text-sm font-medium text-white">{{ stream.title }}</span>
      <LiveBadge :live="stream.actualLive" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StreamPublic, StreamDetail } from '~/composables/useApi';

const props = defineProps<{
  stream: StreamPublic;
  streamSlug?: string;
}>();

const streamsApi = useStreams();

const detail = ref<StreamDetail | null>(null);
const pending = ref(false);
const error = ref('');

const isLive = computed(() => props.stream.actualLive || props.stream.liveStatus);

async function loadDetail() {
  pending.value = true;
  error.value = '';
  try {
    detail.value = await streamsApi.bySlug(props.streamSlug || props.stream.slug);
  } catch (e) {
    detail.value = null;
    error.value = apiErrorMessage(e, '获取播放地址失败');
  } finally {
    pending.value = false;
  }
}

watch(
  () => props.streamSlug || props.stream.slug,
  () => {
    detail.value = null;
    loadDetail();
  },
);

onMounted(loadDetail);
</script>
