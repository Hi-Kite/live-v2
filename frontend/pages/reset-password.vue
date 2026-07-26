<template>
  <AuthShell title="重置密码" subtitle="为账号设置新密码">
    <form class="space-y-4" @submit.prevent="submit">
      <UiFormField label="新密码" hint="至少 8 位">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="form.newPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            placeholder="••••••••"
          />
        </template>
      </UiFormField>

      <UiFormField label="确认密码" :error="confirmError">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="form.confirm"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            :invalid="!!confirmError"
            placeholder="••••••••"
          />
        </template>
      </UiFormField>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-if="ok" class="text-sm text-green-600 dark:text-green-400">密码已重置，正在跳转登录…</p>

      <UiButton type="submit" block :loading="loading">
        {{ loading ? '处理中…' : '重置密码' }}
      </UiButton>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="text-brand-600 hover:underline">返回登录</NuxtLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
const route = useRoute();
const api = useApi();
const csrf = useCsrf();
const toast = useToast();

const form = reactive({ newPassword: '', confirm: '' });
const loading = ref(false);
const error = ref('');
const confirmError = ref('');
const ok = ref(false);

async function submit() {
  error.value = '';
  confirmError.value = '';
  if (form.newPassword !== form.confirm) {
    confirmError.value = '两次密码不一致';
    return;
  }
  loading.value = true;
  try {
    await csrf.ensure();
    await api.post('/api/auth/reset-password', {
      token: route.query.token,
      newPassword: form.newPassword,
    });
    ok.value = true;
    toast.success('密码已重置，请使用新密码登录');
    setTimeout(() => navigateTo('/login'), 1500);
  } catch (e: unknown) {
    error.value = apiErrorMessage(e, '重置失败');
  } finally {
    loading.value = false;
  }
}

useHead({ title: '重置密码 — LIVE' });
</script>
