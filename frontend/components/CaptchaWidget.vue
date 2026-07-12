<template>
  <div class="flex items-end gap-2">
    <div class="flex-1">
      <img
        v-if="svg"
        :src="svg"
        alt="captcha"
        class="h-12 w-32 cursor-pointer rounded border"
        :style="{ borderColor: 'var(--border)' }"
        title="点击刷新"
        @click="refresh"
      />
      <div v-else class="flex h-12 w-32 items-center justify-center rounded border text-xs text-slate-400" :style="{ borderColor: 'var(--border)' }">
        加载中…
      </div>
    </div>
    <input
      v-model="code"
      class="input"
      placeholder="验证码"
      autocomplete="off"
      @input="emitChange"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{
  'update:modelValue': [v: string];
  change: [payload: { id: string; code: string }];
}>();

const svg = ref<string | null>(null);
const id = ref('');
const code = ref(props.modelValue || '');

async function refresh() {
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
    // ignore
  }
}

function emitChange() {
  emit('update:modelValue', code.value);
  emit('change', { id: id.value, code: code.value });
}

onMounted(refresh);
</script>
