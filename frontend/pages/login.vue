<template>
  <div class="mx-auto flex max-w-md flex-col gap-6 py-10">
    <div class="text-center">
      <h1 class="text-2xl font-bold">欢迎回来</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">登录以参与直播聊天</p>
    </div>

    <form class="card space-y-4 p-6" @submit.prevent="submit">
      <div class="space-y-1.5">
        <label class="text-sm font-medium">邮箱</label>
        <input v-model="form.email" type="email" class="input" required placeholder="you@example.com" />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">密码</label>
        <input v-model="form.password" type="password" class="input" required placeholder="••••••••" />
      </div>
      <div v-if="need2fa" class="space-y-1.5">
        <label class="text-sm font-medium">两步验证码</label>
        <input v-model="form.twoFactorCode" class="input" placeholder="6 位验证码" autocomplete="one-time-code" />
      </div>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

      <button class="btn-primary w-full" :disabled="loading" type="submit">
        {{ loading ? '登录中…' : '登录' }}
      </button>

      <div class="flex items-center justify-between text-sm">
        <NuxtLink to="/register" class="text-brand-600 hover:underline">没有账号？注册</NuxtLink>
        <NuxtLink to="/forgot-password" class="text-slate-500 hover:underline">忘记密码？</NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/composables/useAuth';

const auth = useAuthStore();
const api = useApi();
const csrf = useCsrf();
const route = useRoute();

const form = reactive({
  email: '',
  password: '',
  twoFactorCode: '',
});
const need2fa = ref(false);
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await csrf.ensure();
    const data = await api.post<{ user: import('~/composables/useApi').UserPublic }>(
      '/api/auth/login',
      {
        email: form.email,
        password: form.password,
        twoFactorCode: form.twoFactorCode || undefined,
      },
    );
    auth.setUser(data.user);
    const redirect = (route.query.redirect as string) || '/';
    await navigateTo(redirect);
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } }).data?.message;
    if (msg && /2FA/i.test(msg)) {
      need2fa.value = true;
      error.value = '请输入两步验证码';
    } else if (msg && /2fa code/i.test(msg)) {
      need2fa.value = true;
      error.value = '请输入两步验证码';
    } else {
      error.value = msg || '登录失败，请检查邮箱和密码';
    }
  } finally {
    loading.value = false;
  }
}

useHead({ title: '登录 — LIVE' });
</script>
