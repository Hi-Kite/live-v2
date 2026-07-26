<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">主播对战</h1>
      <div class="flex items-center gap-3">
        <DanmakuSizeControl v-if="pk.session" class="hidden sm:flex" />
        <UiButton v-if="auth.isAdmin" to="/admin/streams" variant="secondary" size="sm">
          管理对战
        </UiButton>
      </div>
    </div>

    <!-- loading -->
    <div v-if="pending" class="grid gap-4 lg:grid-cols-2">
      <div v-for="i in 2" :key="i" class="card overflow-hidden">
        <UiSkeleton class="aspect-video w-full !rounded-none" />
        <div class="space-y-2 border-t border-line p-4">
          <UiSkeleton class="h-5 w-40" />
        </div>
      </div>
    </div>

    <!-- error -->
    <div v-else-if="loadError" class="card">
      <UiEmptyState title="加载失败" :description="loadError">
        <template #action>
          <UiButton size="sm" @click="load">重试</UiButton>
        </template>
      </UiEmptyState>
    </div>

    <!-- no active PK -->
    <div v-else-if="!pk.session" class="card">
      <UiEmptyState
        title="当前没有进行中的对战"
        :description="auth.isAdmin ? '前往后台直播间管理发起一场对战' : '主播发起对战后这里会自动开始'"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
        </template>
        <template #action>
          <UiButton v-if="auth.isAdmin" to="/admin/streams" size="sm">去发起对战</UiButton>
        </template>
      </UiEmptyState>
    </div>

    <div v-else class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <!-- PK 舞台：比分条 + 双路播放器一体化 -->
      <div class="card min-w-0 overflow-hidden">
      <div class="space-y-3 border-b border-line p-4 sm:p-5">
        <div class="flex items-center justify-between gap-3 text-sm font-bold">
          <span class="min-w-0 truncate text-brand-600 dark:text-brand-400">{{ pk.streams[0]?.title }}</span>
          <span
            class="shrink-0 rounded-full bg-gradient-to-b from-red-500 to-rose-600 px-2.5 py-0.5 text-xs font-black italic tracking-wider text-white shadow-glow"
          >VS</span>
          <span class="min-w-0 truncate text-right text-rose-500">{{ pk.streams[1]?.title }}</span>
        </div>
        <div
          class="relative h-3 overflow-hidden rounded-full bg-ink/10"
          role="img"
          :aria-label="`点赞对比：${pk.streams[0]?.title} ${likesA}，${pk.streams[1]?.title} ${likesB}`"
        >
          <div
            class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
            :style="{ width: `${ratioA}%` }"
          />
          <div
            class="absolute inset-y-0 right-0 rounded-l-none rounded-full bg-gradient-to-l from-rose-500 to-rose-400 transition-all duration-500"
            :style="{ width: `${100 - ratioA}%` }"
          />
        </div>
        <div class="flex items-center justify-between text-xs text-soft tabular-nums">
          <span>{{ likesA }} 赞</span>
          <span>{{ likesB }} 赞</span>
        </div>
      </div>

      <!-- 双路播放器：同一舞台内并排，共享中缝分割线 -->
      <div class="grid sm:grid-cols-2 sm:divide-x sm:divide-line">
        <div v-for="(s, i) in pk.streams" :key="s.id" class="min-w-0">
          <div class="relative">
            <ArtplayerView
              v-if="s.actualLive || s.liveStatus"
              :ref="(el) => setPlayerRef(i, el)"
              :key="s.id + '-' + (s.actualLive ? 'live' : 'offline')"
              :src="s.playback.flv"
              kind="flv"
              :actual-live="s.actualLive"
              muted
            >
              <template #overlay>
                <DanmakuOverlay :ref="(el) => setDanmakuRef(i, el)" />
              </template>
            </ArtplayerView>
            <StreamOfflinePanel v-else :title="`${s.title} 未开播`" />
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line p-3">
            <div class="min-w-0">
              <h2 class="truncate text-sm font-bold">{{ s.title }}</h2>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <LikeButton :stream-id="s.id" :count="s.likeCount" />
              <LiveBadge :live="s.actualLive" />
            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- 共享聊天池（桌面端与播放器同屏；某路全屏时 Teleport 进该播放器） -->
      <Teleport :to="chatTarget" :disabled="!chatDocked">
        <div
          :class="
            chatDocked
              ? 'flex h-full w-full flex-col overflow-hidden border-l border-line/60 bg-surface/90 backdrop-blur-md'
              : 'card flex h-[480px] flex-col overflow-hidden xl:h-auto xl:self-stretch'
          "
        >
          <ChatPanel
            v-if="chatStreamId"
            ref="chatRef"
            :stream-id="chatStreamId"
            :initial-messages="[]"
            @send-danmaku="pushDanmaku"
          />
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PkActive, ChatMessage } from '~/composables/useApi';
import { useAuthStore } from '~/composables/useAuth';

// 对战页用加宽容器：双路视频需要更多横向空间
definePageMeta({ layout: 'wide' });

const api = useApi();
const auth = useAuthStore();
const socket = useSocket();
const streamsApi = useStreams();

const pk = ref<PkActive>({ session: null, streams: [] });
const pending = ref(true);
const loadError = ref('');

const chatRef = ref<{ setMessages: (m: ChatMessage[]) => void; append: (m: ChatMessage) => void; setOnline: (n: number) => void } | null>(null);
const danmakuRefs = ref<Array<{ push: (t: string) => void } | null>>([null, null]);

const poolIds = computed(() => pk.value.streams.map((s) => s.id));
/** 共享聊天池以对战 A 方房间为锚点（服务端会自动并入双方消息） */
const chatStreamId = computed(() => pk.value.streams[0]?.id ?? 0);

const likesA = computed(() => pk.value.streams[0]?.likeCount ?? 0);
const likesB = computed(() => pk.value.streams[1]?.likeCount ?? 0);
const ratioA = computed(() => {
  const total = likesA.value + likesB.value;
  if (total === 0) return 50;
  // 双方至少保留 6% 可见宽度
  return Math.min(94, Math.max(6, (likesA.value / total) * 100));
});

function setDanmakuRef(i: number, el: unknown) {
  danmakuRefs.value[i] = (el as { push: (t: string) => void } | null) ?? null;
}

// 全屏聊天停靠：任意一路全屏时，把共享聊天面板 Teleport 进那一路播放器
interface PlayerExposed {
  dockEl: HTMLElement | null;
  isFullscreen: boolean;
}
const playerRefs = ref<Array<PlayerExposed | null>>([null, null]);

function setPlayerRef(i: number, el: unknown) {
  playerRefs.value[i] = (el as PlayerExposed | null) ?? null;
}

const fsPlayer = computed(
  () => playerRefs.value.find((p) => p?.isFullscreen && p.dockEl) ?? null,
);
const chatDocked = computed(() => !!fsPlayer.value);
const chatTarget = computed<HTMLElement | string>(() => fsPlayer.value?.dockEl ?? 'body');

function pushDanmaku(text: string) {
  for (const r of danmakuRefs.value) r?.push(text);
}

// 请求序号守卫：pkEnded→pkStarted 快速连发时，丢弃过期响应，
// 避免旧的「无对战」响应覆盖掉新开的对战
let loadSeq = 0;

async function load() {
  const seq = ++loadSeq;
  pending.value = true;
  loadError.value = '';
  try {
    const res = await api.get<PkActive>('/api/streams/pk/active');
    if (seq !== loadSeq) return;
    pk.value = res;
    if (pk.value.session && chatStreamId.value) {
      await nextTick();
      socket.emit('joinStream', { streamId: chatStreamId.value });
    }
  } catch (e) {
    if (seq !== loadSeq) return;
    loadError.value = apiErrorMessage(e, '加载对战信息失败');
  } finally {
    if (seq === loadSeq) pending.value = false;
  }
}

/** 只刷新受影响的一路：开播/停播不再整页重载（避免双播放器销毁重建、全屏被踢出） */
async function refreshStream(id: number) {
  const cur = pk.value.streams.find((s) => s.id === id);
  if (!cur) return;
  try {
    const d = await streamsApi.bySlug(cur.slug);
    const i = pk.value.streams.indexOf(cur);
    if (i >= 0) pk.value.streams.splice(i, 1, d);
  } catch {
    // 状态刷新失败保留当前画面
  }
}

const offs: Array<() => void> = [];

onMounted(() => {
  offs.push(
    socket.on('messageHistory', (p) => {
      const payload = p as { streamId: number; messages: ChatMessage[] };
      if (payload.streamId === chatStreamId.value) {
        chatRef.value?.setMessages(payload.messages);
      }
    }),
  );
  offs.push(
    socket.on('message', (m) => {
      const msg = m as ChatMessage;
      const mine =
        poolIds.value.includes(msg.streamId) ||
        msg.poolStreamIds?.some((id) => poolIds.value.includes(id));
      if (!mine) return;
      chatRef.value?.append(msg);
    }),
  );
  offs.push(
    socket.on('onlineCount', (p) => {
      const payload = p as { streamId: number; count: number };
      if (payload.streamId === chatStreamId.value) chatRef.value?.setOnline(payload.count);
    }),
  );
  offs.push(
    socket.on('likeCount', (p) => {
      const payload = p as { streamId: number; count: number };
      const s = pk.value.streams.find((x) => x.id === payload.streamId);
      if (s) s.likeCount = payload.count;
    }),
  );
  offs.push(socket.on('pkStarted', () => load()));
  offs.push(socket.on('pkEnded', () => load()));
  offs.push(
    socket.on('streamStarted', (p) => {
      const id = (p as { id: number }).id;
      if (pk.value.session && poolIds.value.includes(id)) refreshStream(id);
    }),
  );
  offs.push(
    socket.on('streamStopped', (p) => {
      const id = (p as { streamId: number }).streamId;
      if (pk.value.session && poolIds.value.includes(id)) refreshStream(id);
    }),
  );

  load();
});

onUnmounted(() => {
  offs.splice(0).forEach((off) => off());
});

useHead({ title: '主播对战 — LIVE' });
</script>
