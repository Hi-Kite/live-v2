<template>
  <div class="space-y-6">
    <div v-if="!stream" class="card flex items-center justify-center p-12 text-sm text-slate-400">
      加载中…
    </div>
    <template v-else>
      <NuxtLink to="/" class="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        返回首页
      </NuxtLink>

      <div class="card overflow-hidden">
        <div class="relative">
          <ArtplayerView
            v-if="stream.actualLive || stream.liveStatus"
            :src="stream.playback.flv"
            kind="flv"
            :actual-live="stream.actualLive"
          >
            <template #overlay><DanmakuOverlay ref="danmakuRef" /></template>
          </ArtplayerView>
          <div v-else class="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-slate-900 text-white">
            <svg viewBox="0 0 24 24" class="h-12 w-12 text-brand-400" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <p class="text-sm">直播未开始</p>
          </div>
        </div>
        <div class="flex items-center justify-between border-t p-4" :style="{ borderColor: 'var(--border)' }">
          <div>
            <h1 class="text-lg font-bold">{{ stream.title }}</h1>
            <p v-if="stream.description" class="mt-1 text-sm text-slate-500">{{ stream.description }}</p>
          </div>
          <LiveBadge :live="stream.actualLive" />
        </div>
      </div>

      <div class="card h-[480px] overflow-hidden">
        <ChatPanel
          ref="chatRef"
          :stream-id="stream.id"
          :initial-messages="[]"
          @send-danmaku="(t) => danmakuRef?.push(t)"
          @delete="(id) => onDelete(id)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { StreamDetail, ChatMessage } from '~/composables/useApi';

const route = useRoute();
const streamsApi = useStreams();
const socket = useSocket();

const stream = ref<StreamDetail | null>(null);
const chatRef = ref<{ setMessages: (m: ChatMessage[]) => void; append: (m: ChatMessage) => void; removeMessage: (id: number) => void; setOnline: (n: number) => void } | null>(null);
const danmakuRef = ref<{ push: (t: string) => void } | null>(null);

async function load() {
  const slug = route.params.slug as string;
  stream.value = await streamsApi.bySlug(slug);
  await nextTick();
  socket.emit('joinStream', { streamId: stream.value.id });
}

onMounted(async () => {
  await load();
  socket.on('messageHistory', (p) => {
    const payload = p as { streamId: number; messages: ChatMessage[] };
    if (stream.value && payload.streamId === stream.value.id) {
      chatRef.value?.setMessages(payload.messages);
    }
  });
  socket.on('message', (m) => {
    const msg = m as ChatMessage;
    if (stream.value && msg.streamId === stream.value.id) chatRef.value?.append(msg);
  });
  socket.on('streamMessage', (p) => {
    const payload = p as { streamId: number; message: ChatMessage };
    if (stream.value && payload.streamId === stream.value.id) chatRef.value?.append(payload.message);
  });
  socket.on('messageDeleted', (p) => {
    chatRef.value?.removeMessage((p as { id: number }).id);
  });
  socket.on('onlineCount', (p) => {
    const payload = p as { streamId: number; count: number };
    if (stream.value && payload.streamId === stream.value.id) chatRef.value?.setOnline(payload.count);
  });
});

function onDelete(id: number) {
  socket.emit('deleteMessage', { messageId: id, streamId: stream.value?.id });
}

useHead(() => ({ title: `${stream.value?.title || '直播间'} — LIVE` }));
</script>
