<template>
  <div class="mx-auto flex max-w-md flex-col gap-6 py-10">
    <div class="card space-y-4 p-8 text-center">
      <div v-if="state === 'loading'" class="space-y-3">
        <div class="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p class="text-sm text-slate-500">正在验证邮箱…</p>
      </div>

      <template v-else-if="state === 'ok'">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 class="text-xl font-bold">邮箱验证成功</h1>
        <p class="text-sm text-slate-500">您现在可以登录了。</p>
        <NuxtLink to="/login" class="btn-primary">前往登录</NuxtLink>
      </template>

      <template v-else>
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
        <h1 class="text-xl font-bold">验证失败</h1>
        <p class="text-sm text-slate-500">{{ error }}</p>
        <NuxtLink to="/" class="btn-secondary">返回首页</NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const api = useApi();
const csrf = useCsrf();

type State = 'loading' | 'ok' | 'error';
const state = ref<State>('loading');
const error = ref('');

async function run() {
  const token = (route.query.token as string) || '';
  if (!token) {
    state.value = 'error';
    error.value = '缺少验证令牌';
    return;
  }
  try {
    await csrf.ensure();
    await api.post('/api/auth/verify-email', { token });
    state.value = 'ok';
  } catch (e: unknown) {
    state.value = 'error';
    error.value =
      (e as { data?: { message?: string } }).data?.message || '验证失败';
  }
}

onMounted(run);
useHead({ title: '邮箱验证 — LIVE' });
</script>
