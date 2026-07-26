<template>
  <div class="space-y-6">
    <NuxtLink to="/" class="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      返回首页
    </NuxtLink>

    <!-- loading skeleton -->
    <div v-if="pending" class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div class="card self-start overflow-hidden">
        <UiSkeleton class="aspect-video w-full !rounded-none" />
        <div class="space-y-2 border-t border-line p-4">
          <UiSkeleton class="h-5 w-40" />
          <UiSkeleton class="h-3 w-64 max-w-full" />
        </div>
      </div>
      <div class="card flex h-[600px] flex-col gap-3 p-4 lg:h-auto">
        <UiSkeleton class="h-4 w-20" />
        <UiSkeleton class="h-4 w-3/4" />
        <UiSkeleton class="h-4 w-1/2" />
        <UiSkeleton class="h-4 w-2/3" />
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

    <div v-else-if="stream" class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <!-- player -->
      <div class="space-y-4">
        <div class="card overflow-hidden">
          <div class="relative">
            <ArtplayerView
              v-if="stream.actualLive || stream.liveStatus"
              :key="stream.id + '-' + (stream.actualLive ? 'live' : 'offline')"
              :src="stream.playback.flv"
              kind="flv"
              :actual-live="stream.actualLive"
            >
              <template #overlay><DanmakuOverlay ref="danmakuRef" /></template>
            </ArtplayerView>
            <div
              v-else
              class="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-slate-900 text-white"
            >
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600/20">
                <svg viewBox="0 0 24 24" class="h-8 w-8 text-brand-400" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <p class="text-sm text-slate-300">直播未开始</p>
              <p class="text-xs text-slate-500">开播后将自动播放</p>
            </div>
          </div>
          <div class="flex items-center justify-between gap-3 border-t border-line p-4">
            <div class="min-w-0">
              <h1 class="truncate text-lg font-bold">{{ stream.title }}</h1>
              <p v-if="stream.description" class="mt-1 text-sm text-soft">{{ stream.description }}</p>
            </div>
            <LiveBadge :live="stream.actualLive" />
          </div>
        </div>
      </div>

      <!-- chat -->
      <div class="card flex h-[600px] flex-col overflow-hidden lg:h-auto">
        <ChatPanel
          ref="chatRef"
          :stream-id="stream.id"
          :initial-messages="[]"
          @send-danmaku="(t) => danmakuRef?.push(t)"
          @delete="(id) => onDelete(id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StreamDetail, ChatMessage } from '~/composables/useApi';

const route = useRoute();
const streamsApi = useStreams();
const socket = useSocket();

const stream = ref<StreamDetail | null>(null);
const pending = ref(true);
const loadError = ref('');

const chatRef = ref<{ setMessages: (m: ChatMessage[]) => void; append: (m: ChatMessage) => void; removeMessage: (id: number) => void; setOnline: (n: number) => void } | null>(null);
const danmakuRef = ref<{ push: (t: string) => void } | null>(null);

const slug = computed(() => route.params.slug as string);

async function load() {
  pending.value = true;
  loadError.value = '';
  try {
    stream.value = await streamsApi.bySlug(slug.value);
  } catch (e) {
    const err = e as { statusCode?: number; status?: number } | null;
    const status = err?.statusCode ?? err?.status;
    if (status === 404) {
      throw createError({ statusCode: 404, statusMessage: '直播间不存在', fatal: true });
    }
    loadError.value = apiErrorMessage(e, '加载直播间失败');
    return;
  } finally {
    pending.value = false;
  }
  const loaded = stream.value;
  if (!loaded) return;
  await nextTick();
  socket.emit('joinStream', { streamId: loaded.id });
}

async function refreshStatus() {
  try {
    stream.value = await streamsApi.bySlug(slug.value);
  } catch {
    // 后台状态刷新失败时保留当前画面
  }
}

const offs: Array<() => void> = [];

onMounted(async () => {
  offs.push(
    socket.on('messageHistory', (p) => {
      const payload = p as { streamId: number; messages: ChatMessage[] };
      if (stream.value && payload.streamId === stream.value.id) {
        chatRef.value?.setMessages(payload.messages);
      }
    }),
  );
  offs.push(
    socket.on('message', (m) => {
      const msg = m as ChatMessage;
      if (stream.value && msg.streamId === stream.value.id) chatRef.value?.append(msg);
    }),
  );
  offs.push(
    socket.on('streamMessage', (p) => {
      const payload = p as { streamId: number; message: ChatMessage };
      if (stream.value && payload.streamId === stream.value.id) chatRef.value?.append(payload.message);
    }),
  );
  offs.push(
    socket.on('messageDeleted', (p) => {
      chatRef.value?.removeMessage((p as { id: number }).id);
    }),
  );
  offs.push(
    socket.on('onlineCount', (p) => {
      const payload = p as { streamId: number; count: number };
      if (stream.value && payload.streamId === stream.value.id) chatRef.value?.setOnline(payload.count);
    }),
  );
  offs.push(
    socket.on('streamStarted', (p) => {
      const payload = p as { id: number; slug: string; title: string };
      if (stream.value && payload.id === stream.value.id) refreshStatus();
    }),
  );
  offs.push(
    socket.on('streamStopped', (p) => {
      const payload = p as { streamId: number };
      if (stream.value && payload.streamId === stream.value.id) refreshStatus();
    }),
  );

  await load();
});

onUnmounted(() => {
  offs.splice(0).forEach((off) => off());
});

function onDelete(id: number) {
  socket.emit('deleteMessage', { messageId: id, streamId: stream.value?.id });
}

useHead(() => ({ title: `${stream.value?.title || '直播间'} — LIVE` }));
</script>
