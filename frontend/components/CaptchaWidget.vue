<template>
  <div class="flex items-end gap-2">
    <!-- 图片列必须定宽（shrink-0）：flex-1 会被旁边 w-full 的输入框挤成 0 宽 -->
    <div class="shrink-0">
      <button
        v-if="svg"
        type="button"
        class="group relative block overflow-hidden rounded border border-line transition-colors hover:border-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-label="点击刷新验证码"
        title="点击刷新验证码"
        :disabled="loading"
        @click="refresh"
      >
        <img :src="svg" alt="验证码图片" class="h-12 w-32" :class="loading && 'opacity-50'" />
        <span
          class="absolute bottom-0.5 right-0.5 rounded bg-black/40 p-0.5 text-white opacity-70 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >
          <svg class="h-3 w-3" :class="loading && 'animate-spin'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
        </span>
      </button>
      <button
        v-else-if="loadError"
        type="button"
        class="flex h-12 w-32 items-center justify-center rounded border border-line text-xs text-red-500 transition-colors hover:border-brand-500"
        aria-label="验证码加载失败，点击重试"
        :disabled="loading"
        @click="refresh"
      >
        加载失败，点击重试
      </button>
      <div
        v-else
        class="flex h-12 w-32 items-center justify-center rounded border border-line text-xs text-soft"
      >
        加载中…
      </div>
    </div>
    <UiInput
      v-model="code"
      class="min-w-0 flex-1"
      placeholder="验证码"
      autocomplete="off"
      aria-label="验证码"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{
  'update:modelValue': [v: string];
  change: [payload: { id: string; code: string }];
}>();

const toast = useToast();

const svg = ref<string | null>(null);
const id = ref('');
const code = ref(props.modelValue || '');
const loading = ref(false);
const loadError = ref(false);

async function refresh() {
  if (loading.value) return;
  loading.value = true;
  loadError.value = false;
  try {
    const config = useRuntimeConfig();
    const data = await $fetch<{ id: string; svg: string }>(
      '/api/captcha',
      { baseURL: config.public.apiBase as string },
    );
    svg.value = data.svg.startsWith('data:image')
      ? data.svg
      : `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data.svg)))}`;
    id.value = data.id;
    code.value = '';
    emitChange();
  } catch {
    // 首次加载失败显示重试块；已有验证码时刷新失败不能静默，要给出反馈
    if (!svg.value) loadError.value = true;
    else toast.error('验证码刷新失败，请重试');
  } finally {
    loading.value = false;
  }
}

function emitChange() {
  emit('update:modelValue', code.value);
  emit('change', { id: id.value, code: code.value });
}

watch(code, emitChange);

// keep the field in sync when the parent resets the value externally
watch(
  () => props.modelValue,
  (v) => {
    if (typeof v === 'string' && v !== code.value) code.value = v;
  },
);

onMounted(refresh);

defineExpose({ refresh });
</script>
