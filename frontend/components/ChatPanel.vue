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
          class="group flex gap-2 text-sm"
        >
          <UiAvatar :name="m.user.username" size="sm" />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <span class="font-medium">{{ m.user.username }}</span>
              <span class="text-xs text-soft">{{ formatTime(m.createdAt) }}</span>
              <button
                v-if="auth.isAdmin"
                type="button"
                class="-m-1 rounded p-1 leading-none text-red-500 opacity-0 transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                aria-label="删除消息"
                title="删除消息"
                @click="emitDelete(m.id)"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
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
        <div class="mt-2 flex items-center gap-3 text-xs text-soft">
          <label class="flex cursor-pointer items-center gap-1">
            <input v-model="danmakuOn" type="checkbox" class="rounded" />
            弹幕
          </label>
          <span>{{ draft.length }}/500</span>
        </div>
      </template>
    </div>
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
  'delete': [id: number];
}>();

const auth = useAuthStore();
const toast = useToast();
const messages = ref<ChatMessage[]>([...props.initialMessages]);
const draft = ref('');
const sending = ref(false);
const online = ref(0);
const danmakuOn = ref(true);
const listEl = ref<HTMLElement | null>(null);
const newCount = ref(0);

const NEAR_BOTTOM_PX = 80;

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
  if (danmakuOn.value) emit('send-danmaku', m.content);
  if (wasNearBottom) {
    scrollToBottom();
  } else {
    newCount.value++;
  }
}

function emitDelete(id: number) {
  emit('delete', id);
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
  removeMessage(id: number) {
    messages.value = messages.value.filter((m) => m.id !== id);
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

let offError: (() => void) | undefined;

onMounted(() => {
  scrollToBottom();
  // 服务端限流/校验失败会通过 error 事件回告发送者
  offError = useSocket().on('error', (payload) => {
    const msg = (payload as { message?: string } | undefined)?.message;
    if (msg) toast.error(msg);
  });
});

onBeforeUnmount(() => {
  offError?.();
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
