<template>
  <AuthShell title="欢迎回来" subtitle="登录以参与直播聊天">
    <form class="space-y-4" @submit.prevent="submit">
      <UiFormField label="邮箱">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          />
        </template>
      </UiFormField>

      <UiFormField label="密码">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="form.password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </template>
      </UiFormField>

      <UiFormField v-if="need2fa" label="两步验证码" hint="请输入验证器 App 中的 6 位验证码">
        <template #default="{ id }">
          <UiInput
            :id="id"
            ref="twoFaInput"
            v-model="form.twoFactorCode"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="6 位验证码"
          />
        </template>
      </UiFormField>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

      <UiButton type="submit" block :loading="loading">
        {{ loading ? '登录中…' : '登录' }}
      </UiButton>
    </form>

    <template #footer>
      <div class="flex items-center justify-center gap-6">
        <NuxtLink to="/register" class="text-brand-600 hover:underline">没有账号？注册</NuxtLink>
        <NuxtLink to="/forgot-password" class="hover:underline">忘记密码？</NuxtLink>
      </div>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { useAuthStore } from '~/composables/useAuth';

const auth = useAuthStore();
const api = useApi();
const csrf = useCsrf();
const route = useRoute();
const toast = useToast();

const form = reactive({
  email: '',
  password: '',
  twoFactorCode: '',
});
const need2fa = ref(false);
const loading = ref(false);
const error = ref('');
const twoFaInput = ref<ComponentPublicInstance | null>(null);

watch(need2fa, async (shown) => {
  if (!shown) return;
  await nextTick();
  const el = twoFaInput.value?.$el as HTMLInputElement | undefined;
  el?.focus?.();
});

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
    toast.success('登录成功');
    const redirect = (route.query.redirect as string) || '/';
    await navigateTo(redirect);
  } catch (e: unknown) {
    const err = e as { data?: { code?: string; message?: string } };
    const code = err.data?.code;
    const msg = err.data?.message;
    if (code === 'TWO_FACTOR_REQUIRED' || (msg && /2FA/i.test(msg))) {
      need2fa.value = true;
      error.value = '请输入两步验证码';
    } else {
      error.value = apiErrorMessage(e, '登录失败，请检查邮箱和密码');
    }
  } finally {
    loading.value = false;
  }
}

useHead({ title: '登录 — LIVE' });
</script>
