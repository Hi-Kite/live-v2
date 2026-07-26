<template>
  <div class="space-y-6">
    <!-- Stream selector (if more than one) -->
    <div v-if="streams.length > 1" class="flex flex-wrap gap-2">
      <UiButton
        v-for="s in streams"
        :key="s.id"
        :variant="activeId === s.id ? 'primary' : 'secondary'"
        @click="activeId = s.id"
      >
        {{ s.title }}
        <LiveBadge :live="s.liveStatus" />
      </UiButton>
    </div>

    <!-- list load error -->
    <div v-if="loadError" class="card">
      <UiEmptyState title="加载失败" :description="loadError">
        <template #action>
          <UiButton size="sm" @click="init">重试</UiButton>
        </template>
      </UiEmptyState>
    </div>

    <!-- empty list -->
    <div v-else-if="!loading && streams.length === 0" class="card">
      <UiEmptyState title="暂无直播间" description="还没有可观看的直播间，请稍后再来">
        <template #icon>
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M8 7l4-4 4 4" />
          </svg>
        </template>
      </UiEmptyState>
    </div>

    <!-- detail load error -->
    <div v-else-if="detailError && !current" class="card">
      <UiEmptyState title="加载直播间失败" :description="detailError">
        <template #action>
          <UiButton size="sm" @click="retryDetail">重试</UiButton>
        </template>
      </UiEmptyState>
    </div>

    <div v-else-if="current" class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <!-- player -->
      <div class="space-y-4">
        <div class="card overflow-hidden">
          <div class="relative">
            <ArtplayerView
              v-if="current.actualLive || current.liveStatus"
              ref="playerRef"
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

            <StreamOfflinePanel v-else :title="`${current.title} 当前未开播`" />
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
            <div class="min-w-0">
              <h1 class="truncate text-lg font-bold">{{ current.title }}</h1>
              <p v-if="current.description" class="mt-0.5 line-clamp-1 text-xs text-soft">
                {{ current.description }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <DanmakuSizeControl class="hidden sm:flex" />
              <LikeButton :stream-id="current.id" :count="current.likeCount" />
              <LiveBadge :live="current.actualLive" />
            </div>
          </div>
        </div>
      </div>

      <!-- chat（全屏时 Teleport 到播放器内的停靠区） -->
      <Teleport :to="chatTarget" :disabled="!chatDocked">
        <div
          :class="
            chatDocked
              ? 'flex h-full w-full flex-col overflow-hidden border-l border-line/60 bg-surface/90 backdrop-blur-md'
              : 'card flex h-[600px] flex-col overflow-hidden lg:h-auto'
          "
        >
          <ChatPanel
            v-if="chatMounted"
            ref="chatRef"
            :stream-id="current.id"
            :initial-messages="initialMessages"
            @send-danmaku="(t) => danmakuRef?.push(t)"
          />
        </div>
      </Teleport>
    </div>

    <!-- loading skeleton -->
    <div v-else class="grid gap-4 lg:grid-cols-[1fr_360px]">
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

const loading = ref(true);
const loadError = ref('');
const detailError = ref('');

const chatRef = ref<InstanceType<typeof import('~/components/ChatPanel.vue').default> | null>(null);
const danmakuRef = ref<{ push: (t: string) => void } | null>(null);

// 全屏聊天停靠：播放器全屏时把聊天面板 Teleport 进播放器内
const playerRef = ref<{ dockEl: HTMLElement | null; isFullscreen: boolean } | null>(null);
const chatDocked = computed(() => !!(playerRef.value?.isFullscreen && playerRef.value.dockEl));
const chatTarget = computed<HTMLElement | string>(() => playerRef.value?.dockEl ?? 'body');

const current = computed(() => (activeId.value && details.value[activeId.value]) || null);

async function init() {
  loading.value = true;
  loadError.value = '';
  try {
    streams.value = await streamsApi.list();
    if (streams.value.length && activeId.value === null) {
      const live = streams.value.find((s) => s.liveStatus || s.actualLive);
      // watcher on activeId loads the detail + mounts chat
      activeId.value = (live || streams.value[0]).id;
    }
  } catch (e) {
    loadError.value = apiErrorMessage(e, '加载直播间列表失败');
  } finally {
    loading.value = false;
  }
}

async function loadDetail(id: number) {
  const s = streams.value.find((x) => x.id === id);
  if (!s) return;
  try {
    const d = await streamsApi.bySlug(s.slug);
    details.value = { ...details.value, [id]: d };
    if (activeId.value === id) detailError.value = '';
  } catch (e) {
    // only surface the error when there is nothing to show for the active stream
    if (activeId.value === id && !details.value[id]) {
      detailError.value = apiErrorMessage(e, '加载直播间信息失败');
    }
  }
}

async function selectStream(id: number) {
  chatMounted.value = false;
  detailError.value = '';
  await loadDetail(id);
  if (activeId.value !== id) return;
  if (!details.value[id]) return; // failed — error state is shown instead
  initialMessages.value = [];
  chatMounted.value = true;
  await nextTick();
  socket.emit('joinStream', { streamId: id });
}

watch(activeId, (id) => {
  if (id) selectStream(id);
});

function retryDetail() {
  if (activeId.value) selectStream(activeId.value);
}

const offs: Array<() => void> = [];

onMounted(() => {
  offs.push(
    socket.on('messageHistory', (payload) => {
      const p = payload as { streamId: number; messages: ChatMessage[] };
      if (current.value && p.streamId === current.value.id) {
        initialMessages.value = p.messages;
        chatRef.value?.setMessages(p.messages);
      }
    }),
  );
  offs.push(
    socket.on('message', (payload) => {
      const m = payload as ChatMessage;
      // PK 期间共享聊天池：对战双方的消息都要收
      const mine =
        current.value &&
        (m.streamId === current.value.id ||
          m.poolStreamIds?.includes(current.value.id));
      if (mine) chatRef.value?.append(m);
    }),
  );
  offs.push(
    socket.on('likeCount', (payload) => {
      const p = payload as { streamId: number; count: number };
      const d = details.value[p.streamId];
      if (d) d.likeCount = p.count;
    }),
  );
  offs.push(
    socket.on('onlineCount', (payload) => {
      const p = payload as { streamId: number; count: number };
      if (current.value && p.streamId === current.value.id) {
        chatRef.value?.setOnline(p.count);
      }
    }),
  );
  offs.push(
    socket.on('streamStarted', (payload) => {
      const p = payload as { id: number; slug: string; title: string };
      const s = streams.value.find((x) => x.id === p.id);
      if (s) {
        s.liveStatus = true;
        if (current.value?.id === p.id) loadDetail(p.id);
      }
    }),
  );
  offs.push(
    socket.on('streamStopped', (payload) => {
      const p = payload as { streamId: number };
      const s = streams.value.find((x) => x.id === p.streamId);
      if (s) {
        s.liveStatus = false;
        if (current.value?.id === p.streamId) loadDetail(p.streamId);
      }
    }),
  );

  init();
});

onUnmounted(() => {
  offs.splice(0).forEach((off) => off());
});

useHead({ title: '直播 — LIVE' });
</script>
