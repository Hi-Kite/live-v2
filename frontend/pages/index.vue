<template>
  <div class="space-y-6">
    <!-- Stream selector (if more than one) -->
    <div v-if="streams.length > 1" class="flex flex-wrap gap-2">
      <button
        v-for="s in streams"
        :key="s.id"
        class="btn text-sm"
        :class="activeId === s.id ? 'bg-brand-600 text-white hover:bg-brand-700' : 'btn-secondary'"
        @click="activeId = s.id"
      >
        {{ s.title }}
        <LiveBadge :live="s.liveStatus" />
      </button>
    </div>

    <div v-if="!current" class="card flex items-center justify-center p-12">
      <p class="text-sm text-slate-400">加载中…</p>
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <!-- player -->
      <div class="space-y-4">
        <div class="card overflow-hidden">
          <div class="relative">
            <ArtplayerView
              v-if="current.actualLive || current.liveStatus"
              :key="current.id + '-' + (current.actualLive ? 'live' : 'offline')"
              :src="current.playback.flv"
              :kind="'flv'"
              :actual-live="current.actualLive"
              waiting-text="直播尚未开始，正在等待信号…"
            >
              <template #overlay>
                <DanmakuOverlay ref="danmakuRef" />
              </template>
            </ArtplayerView>

            <div
              v-else
              class="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-slate-900 text-white"
            >
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600/20">
                <svg viewBox="0 0 24 24" class="h-8 w-8 text-brand-400" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <p class="text-sm text-slate-300">{{ current.title }} 当前未开播</p>
              <p class="text-xs text-slate-500">开播后将自动播放</p>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 border-t p-4" :style="{ borderColor: 'var(--border)' }">
            <div class="min-w-0">
              <h1 class="truncate text-lg font-bold">{{ current.title }}</h1>
              <p v-if="current.description" class="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                {{ current.description }}
              </p>
            </div>
            <LiveBadge :live="current.actualLive" />
          </div>
        </div>
      </div>

      <!-- chat -->
      <div class="card flex h-[600px] flex-col overflow-hidden lg:h-auto">
        <ChatPanel
          v-if="chatMounted"
          ref="chatRef"
          :stream-id="current.id"
          :initial-messages="initialMessages"
          @send-danmaku="(t) => danmakuRef?.push(t)"
          @delete="onDeleteMessage"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StreamPublic, StreamDetail, ChatMessage } from '~/composables/useApi';

const streamsApi = useStreams();
const socket = useSocket();

const streams = ref<StreamPublic[]>([]);
const details = ref<Record<number, StreamDetail>>({});
const activeId = ref<number | null>(null);
const initialMessages = ref<ChatMessage[]>([]);
const chatMounted = ref(false);

const chatRef = ref<InstanceType<typeof import('~/components/ChatPanel.vue').default> | null>(null);
const danmakuRef = ref<{ push: (t: string) => void } | null>(null);

const current = computed(() => (activeId.value && details.value[activeId.value]) || null);

async function loadList() {
  try {
    streams.value = await streamsApi.list();
    if (streams.value.length && activeId.value === null) {
      const live = streams.value.find((s) => s.liveStatus || s.actualLive);
      activeId.value = (live || streams.value[0]).id;
    }
  } catch {
    // ignore
  }
}

async function loadDetail(id: number) {
  try {
    const s = streams.value.find((x) => x.id === id);
    if (!s) return;
    const d = await streamsApi.bySlug(s.slug);
    details.value = { ...details.value, [id]: d };
  } catch {
    // ignore
  }
}

watch(activeId, async (id) => {
  if (!id) return;
  chatMounted.value = false;
  await loadDetail(id);
  initialMessages.value = [];
  chatMounted.value = true;
  await nextTick();
  socket.emit('joinStream', { streamId: id });
});

onMounted(async () => {
  await loadList();
  if (activeId.value) {
    await loadDetail(activeId.value);
    chatMounted.value = true;
    await nextTick();
    socket.emit('joinStream', { streamId: activeId.value });
  }

  socket.on('messageHistory', (payload) => {
    const p = payload as { streamId: number; messages: ChatMessage[] };
    if (current.value && p.streamId === current.value.id) {
      initialMessages.value = p.messages;
      chatRef.value?.setMessages(p.messages);
    }
  });
  socket.on('message', (payload) => {
    const m = payload as ChatMessage;
    if (current.value && m.streamId === current.value.id) {
      chatRef.value?.append(m);
    }
  });
  socket.on('streamMessage', (payload) => {
    const p = payload as { streamId: number; message: ChatMessage };
    if (current.value && p.streamId === current.value.id) {
      chatRef.value?.append(p.message);
    }
  });
  socket.on('messageDeleted', (payload) => {
    const p = payload as { id: number };
    chatRef.value?.removeMessage(p.id);
  });
  socket.on('onlineCount', (payload) => {
    const p = payload as { streamId: number; count: number };
    if (current.value && p.streamId === current.value.id) {
      chatRef.value?.setOnline(p.count);
    }
  });
  socket.on('streamStarted', (payload) => {
    const p = payload as { id: number; slug: string; title: string };
    const s = streams.value.find((x) => x.id === p.id);
    if (s) {
      s.liveStatus = true;
      if (current.value?.id === p.id) loadDetail(p.id);
    }
  });
  socket.on('streamStopped', (payload) => {
    const p = payload as { streamId: number };
    const s = streams.value.find((x) => x.id === p.streamId);
    if (s) {
      s.liveStatus = false;
      if (current.value?.id === p.streamId) loadDetail(p.streamId);
    }
  });
});

function onDeleteMessage(id: number) {
  socket.emit('deleteMessage', { messageId: id, streamId: current.value?.id });
}

useHead({ title: '直播 — LIVE' });
</script>
