<template>
  <AuthShell title="忘记密码" subtitle="输入注册邮箱，我们会发送重置链接">
    <form class="space-y-4" @submit.prevent="submit">
      <UiFormField label="邮箱">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          />
        </template>
      </UiFormField>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-if="sent" class="text-sm text-green-600 dark:text-green-400">
        如果该邮箱已注册，重置链接已发送。
      </p>

      <UiButton type="submit" block :loading="loading">
        {{ loading ? '发送中…' : '发送重置链接' }}
      </UiButton>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="text-brand-600 hover:underline">返回登录</NuxtLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
const api = useApi();
const csrf = useCsrf();
const toast = useToast();

const email = ref('');
const loading = ref(false);
const sent = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await csrf.ensure();
    await api.post('/api/auth/forgot-password', { email: email.value });
    sent.value = true;
    toast.success('如果该邮箱已注册，重置链接已发送');
  } catch (e: unknown) {
    error.value = apiErrorMessage(e, '发送失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

useHead({ title: '忘记密码 — LIVE' });
</script>
