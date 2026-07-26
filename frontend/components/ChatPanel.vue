<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between border-b border-line px-4 py-3">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold">实时聊天</h3>
        <span class="text-xs text-soft">
          <span
            class="inline-block h-1.5 w-1.5 rounded-full"
            :class="online > 0 ? 'bg-green-500 animate-pulse-dot' : 'bg-slate-400'"
            aria-hidden="true"
          />
          {{ online }} 在线
        </span>
      </div>
      <button class="btn-ghost text-xs !p-1.5" aria-label="回到底部" title="回到底部" @click="jumpToBottom">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </button>
    </div>

    <div class="relative min-h-0 flex-1">
      <div
        ref="listEl"
        role="log"
        aria-live="polite"
        aria-label="聊天消息列表"
        class="h-full space-y-2 overflow-y-auto p-4"
        @scroll.passive="onScroll"
      >
        <template v-if="messages.length === 0">
          <p class="py-8 text-center text-sm text-soft">暂无消息，快来发第一条吧～</p>
        </template>
        <div
          v-for="m in messages"
          :key="m.id"
          class="group -mx-2 flex gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-ink/[0.04]"
        >
          <UiAvatar :name="m.user.username" size="sm" />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <span class="font-medium">{{ m.user.username }}</span>
              <span class="text-xs text-soft">{{ formatTime(m.createdAt) }}</span>
              <button
                v-if="auth.isAdmin && m.user.id !== auth.user?.id"
                type="button"
                class="-m-1 rounded p-1 text-xs leading-none text-soft opacity-0 transition-opacity hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                :aria-label="`禁言 ${m.user.username}`"
                title="禁言该用户"
                @click="openMute(m.user)"
              >
                禁言
              </button>
            </div>
            <p class="break-words text-ink">{{ m.content }}</p>
          </div>
        </div>
      </div>

      <Transition name="chat-pill">
        <button
          v-if="newCount > 0"
          type="button"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-brand-700"
          @click="jumpToBottom"
        >
          {{ newCount }} 条新消息 ↓
        </button>
      </Transition>
    </div>

    <div class="border-t border-line p-3">
      <template v-if="!auth.isLoggedIn">
        <div class="flex items-center justify-between gap-2 text-sm">
          <span class="text-soft">登录以参与聊天</span>
          <UiButton to="/login" size="sm">登录</UiButton>
        </div>
      </template>
      <template v-else>
        <div class="flex gap-2">
          <UiInput
            v-model="draft"
            placeholder="发条消息…"
            maxlength="500"
            aria-label="聊天消息"
            @keydown.enter="onEnter"
          />
          <UiButton class="shrink-0" :disabled="!draft.trim()" :loading="sending" @click="send">
            发送
          </UiButton>
        </div>
        <div v-if="draft.length >= 400" class="mt-1.5 text-right text-xs text-soft">
          {{ draft.length }}/500
        </div>
      </template>
    </div>

    <UiModal v-model:model-value="showMute" title="禁言用户" size="sm">
      <p class="text-sm text-soft">
        将禁止 <strong class="font-semibold text-ink">{{ muteTarget?.username }}</strong>
        在所有直播间发言，选择时长：
      </p>
      <div class="grid grid-cols-3 gap-2">
        <UiButton
          v-for="opt in MUTE_OPTIONS"
          :key="opt.minutes"
          variant="secondary"
          size="sm"
          @click="doMute(opt.minutes)"
        >
          {{ opt.label }}
        </UiButton>
      </div>
      <UiButton variant="ghost" size="sm" block @click="doMute(0)">解除该用户的禁言</UiButton>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/composables/useApi';
import { useAuthStore } from '~/composables/useAuth';

const props = defineProps<{
  streamId: number;
  initialMessages: ChatMessage[];
}>();

const emit = defineEmits<{
  'send-danmaku': [text: string];
}>();

const auth = useAuthStore();
const toast = useToast();
const messages = ref<ChatMessage[]>([...props.initialMessages]);
const draft = ref('');
const sending = ref(false);
const online = ref(0);
const listEl = ref<HTMLElement | null>(null);
const newCount = ref(0);

const NEAR_BOTTOM_PX = 80;

const MUTE_OPTIONS = [
  { label: '10 分钟', minutes: 10 },
  { label: '1 小时', minutes: 60 },
  { label: '24 小时', minutes: 24 * 60 },
];

const showMute = ref(false);
const muteTarget = ref<{ id: number; username: string } | null>(null);

function openMute(user: { id: number; username: string }) {
  muteTarget.value = user;
  showMute.value = true;
}

function doMute(minutes: number) {
  if (!muteTarget.value) return;
  useSocket().emit('muteUser', { userId: muteTarget.value.id, minutes });
  showMute.value = false;
}

function formatTime(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function isNearBottom(): boolean {
  const el = listEl.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
}

async function scrollToBottom() {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}

function jumpToBottom() {
  newCount.value = 0;
  scrollToBottom();
}

function onScroll() {
  if (isNearBottom()) newCount.value = 0;
}

function append(m: ChatMessage) {
  const wasNearBottom = isNearBottom();
  messages.value.push(m);
  if (messages.value.length > 200) messages.value = messages.value.slice(-200);
  emit('send-danmaku', m.content);
  if (wasNearBottom) {
    scrollToBottom();
  } else {
    newCount.value++;
  }
}

function onEnter(e: KeyboardEvent) {
  // IME guard: Enter used to confirm pinyin candidates must not send
  if (e.isComposing || e.keyCode === 229) return;
  send();
}

function send() {
  const text = draft.value.trim();
  if (!text || sending.value) return;
  const socket = useSocket();
  const s = socket.connect();
  if (!s || !s.connected) {
    toast.error('连接已断开，消息未发送，请稍后重试');
    return;
  }
  sending.value = true;
  draft.value = '';
  try {
    socket.emit('sendMessage', { streamId: props.streamId, content: text });
  } catch {
    draft.value = text;
    toast.error('发送失败，请重试');
  } finally {
    sending.value = false;
  }
}

defineExpose({
  append,
  setMessages(list: ChatMessage[]) {
    messages.value = list;
    newCount.value = 0;
    scrollToBottom();
  },
  setOnline(n: number) {
    online.value = n;
  },
});

watch(() => props.initialMessages, () => {
  messages.value = [...props.initialMessages];
  newCount.value = 0;
  scrollToBottom();
});

const offs: Array<() => void> = [];

onMounted(() => {
  scrollToBottom();
  const socket = useSocket();
  // 服务端限流/校验失败会通过 error 事件回告发送者
  offs.push(
    socket.on('error', (payload) => {
      const msg = (payload as { message?: string } | undefined)?.message;
      if (msg) toast.error(msg);
    }),
  );
  // 管理员禁言/解禁操作的回执
  offs.push(
    socket.on('muteResult', (payload) => {
      const p = payload as { username: string; minutes: number };
      if (p.minutes <= 0) toast.success(`已解除 ${p.username} 的禁言`);
      else toast.success(`已禁言 ${p.username}（${p.minutes >= 60 ? `${Math.round(p.minutes / 60)} 小时` : `${p.minutes} 分钟`}）`);
    }),
  );
  // 服务端只发给当事人（user:<id> 房间）
  offs.push(
    socket.on('muted', (payload) => {
      const p = payload as { userId: number; minutes: number };
      if (!auth.user || p.userId !== auth.user.id) return;
      if (p.minutes <= 0) toast.info('你的禁言已被解除');
      else toast.error(`你已被管理员禁言（${p.minutes >= 60 ? `${Math.round(p.minutes / 60)} 小时` : `${p.minutes} 分钟`}）`);
    }),
  );
});

onBeforeUnmount(() => {
  offs.splice(0).forEach((off) => off());
});
</script>

<style scoped>
.chat-pill-enter-active,
.chat-pill-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.chat-pill-enter-from,
.chat-pill-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}
@media (prefers-reduced-motion: reduce) {
  .chat-pill-enter-active,
  .chat-pill-leave-active {
    transition: none;
  }
}
</style>
