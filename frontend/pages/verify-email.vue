<template>
  <AuthShell title="邮箱验证">
    <div class="space-y-4 py-2 text-center">
      <template v-if="state === 'loading'">
        <div
          class="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
          aria-hidden="true"
        />
        <p class="text-sm text-soft">正在验证邮箱…</p>
      </template>

      <template v-else-if="state === 'ok'">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        >
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div class="space-y-1">
          <h2 class="text-xl font-bold">邮箱验证成功</h2>
          <p class="text-sm text-soft">您现在可以登录了。</p>
        </div>
        <div class="flex items-center justify-center gap-3">
          <UiButton to="/login">去登录</UiButton>
          <UiButton to="/" variant="secondary">回首页</UiButton>
        </div>
      </template>

      <template v-else>
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
        >
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div class="space-y-1">
          <h2 class="text-xl font-bold">验证失败</h2>
          <p class="text-sm text-soft">{{ error }}</p>
        </div>
        <div class="flex items-center justify-center gap-3">
          <UiButton to="/login">去登录</UiButton>
          <UiButton to="/" variant="secondary">回首页</UiButton>
        </div>
      </template>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
const route = useRoute();
const api = useApi();
const csrf = useCsrf();
const toast = useToast();

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
    toast.success('邮箱验证成功');
  } catch (e: unknown) {
    state.value = 'error';
    error.value = apiErrorMessage(e, '验证失败');
  }
}

onMounted(run);
useHead({ title: '邮箱验证 — LIVE' });
</script>
