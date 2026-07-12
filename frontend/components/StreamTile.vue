<template>
  <div v-if="stream" class="space-y-2">
    <div class="relative aspect-video bg-black">
      <ArtplayerView
        v-if="stream.actualLive || stream.liveStatus"
        :src="`http://${srsHost}:8080/live/${streamSlug || stream.slug}.flv`"
        kind="flv"
        :actual-live="stream.actualLive"
      >
        <template #overlay><DanmakuOverlay ref="danmakuRef" /></template>
      </ArtplayerView>
      <div v-else class="flex aspect-video w-full items-center justify-center bg-slate-900 text-sm text-slate-400">
        未开播
      </div>
    </div>
    <div class="flex items-center justify-between px-1">
      <span class="text-sm font-medium truncate">{{ stream.title }}</span>
      <LiveBadge :live="stream.actualLive" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StreamPublic } from '~/composables/useApi';

const props = defineProps<{
  stream: StreamPublic;
  streamSlug?: string;
}>();

const emit = defineEmits<{ 'send-danmaku': [text: string] }>();

const config = useRuntimeConfig();
const srsHost = computed(() => {
  const ws = config.public.wsBase as string;
  // best-effort: derive host from api/ws base
  try {
    return new URL(ws).hostname;
  } catch {
    return 'localhost';
  }
});

const danmakuRef = ref<{ push: (t: string) => void } | null>(null);

// note: for PVP we read SRS-FLV directly to avoid per-stream detail calls
</script>
