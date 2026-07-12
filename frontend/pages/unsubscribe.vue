<template>
  <div class="mx-auto flex max-w-md flex-col gap-6 py-10">
    <div class="card space-y-4 p-8 text-center">
      <template v-if="state === 'loading'">
        <div class="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p class="text-sm text-slate-500">正在处理…</p>
      </template>
      <template v-else-if="state === 'ok'">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 class="text-xl font-bold">已取消订阅</h1>
        <p class="text-sm text-slate-500">您将不再收到开播通知。</p>
        <NuxtLink to="/" class="btn-primary">返回首页</NuxtLink>
      </template>
      <template v-else>
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
        <h1 class="text-xl font-bold">操作失败</h1>
        <p class="text-sm text-slate-500">{{ error }}</p>
        <NuxtLink to="/" class="btn-secondary">返回首页</NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();

type State = 'loading' | 'ok' | 'error';
const state = ref<State>('loading');
const error = ref('');

onMounted(async () => {
  try {
    await $fetch('/api/subscriptions/unsubscribe', {
      baseURL: config.public.apiBase as string,
      params: { email: route.query.email, token: route.query.token },
    });
    state.value = 'ok';
  } catch (e: unknown) {
    state.value = 'error';
    error.value = (e as { data?: { message?: string } }).data?.message || '链接无效或已过期';
  }
});
useHead({ title: '退订 — LIVE' });
</script>
