<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between border-b px-4 py-3" :style="{ borderColor: 'var(--border)' }">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold">实时聊天</h3>
        <span class="text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-block h-1.5 w-1.5 rounded-full" :class="online > 0 ? 'bg-green-500 animate-pulse-dot' : 'bg-slate-400'" />
          {{ online }} 在线
        </span>
      </div>
      <button v-if="auth.isLoggedIn" class="btn-ghost text-xs !p-1.5" @click="scrollToBottom" title="回到底部">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </button>
    </div>

    <div ref="listEl" class="flex-1 space-y-2 overflow-y-auto p-4">
      <template v-if="messages.length === 0">
        <p class="py-8 text-center text-sm text-slate-400">暂无消息，快来发第一条吧～</p>
      </template>
      <div
        v-for="m in messages"
        :key="m.id"
        class="group flex gap-2 text-sm"
      >
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {{ m.user.username.charAt(0).toUpperCase() }}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <span class="font-medium">{{ m.user.username }}</span>
            <span class="text-xs text-slate-400">{{ formatTime(m.createdAt) }}</span>
            <button
              v-if="auth.isAdmin"
              class="opacity-0 transition-opacity group-hover:opacity-100 text-red-500 hover:text-red-600"
              title="删除消息"
              @click="emitDelete(m.id)"
            >
              ×
            </button>
          </div>
          <p class="break-words text-slate-700 dark:text-slate-200">{{ m.content }}</p>
        </div>
      </div>
    </div>

    <div class="border-t p-3" :style="{ borderColor: 'var(--border)' }">
      <template v-if="!auth.isLoggedIn">
        <div class="flex items-center justify-between gap-2 text-sm">
          <span class="text-slate-500">登录以参与聊天</span>
          <NuxtLink to="/login" class="btn-primary !py-1.5 text-xs">登录</NuxtLink>
        </div>
      </template>
      <template v-else>
        <div class="flex gap-2">
          <input
            v-model="draft"
            class="input"
            placeholder="发条消息…"
            maxlength="500"
            @keydown.enter="send"
          />
          <button class="btn-primary shrink-0" :disabled="!draft.trim() || sending" @click="send">
            发送
          </button>
        </div>
        <div class="mt-2 flex items-center gap-3 text-xs text-slate-400">
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
const messages = ref<ChatMessage[]>([...props.initialMessages]);
const draft = ref('');
const sending = ref(false);
const online = ref(0);
const danmakuOn = ref(true);
const listEl = ref<HTMLElement | null>(null);

function formatTime(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

async function scrollToBottom() {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}

function append(m: ChatMessage) {
  messages.value.push(m);
  if (messages.value.length > 200) messages.value = messages.value.slice(-200);
  if (danmakuOn.value) emit('send-danmaku', m.content);
  scrollToBottom();
}

function emitDelete(id: number) {
  emit('delete', id);
}

async function send() {
  const text = draft.value.trim();
  if (!text || sending.value) return;
  sending.value = true;
  draft.value = '';
  try {
    const socket = useSocket();
    socket.emit('sendMessage', { streamId: props.streamId, content: text });
  } finally {
    sending.value = false;
  }
}

defineExpose({
  append,
  setMessages(list: ChatMessage[]) {
    messages.value = list;
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
  scrollToBottom();
});

onMounted(() => {
  scrollToBottom();
});
</script>
