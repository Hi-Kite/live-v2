<template>
  <div class="mx-auto flex max-w-md flex-col gap-6 py-10">
    <div class="text-center">
      <h1 class="text-2xl font-bold">重置密码</h1>
      <p class="mt-1 text-sm text-slate-500">为账号设置新密码</p>
    </div>
    <form class="card space-y-4 p-6" @submit.prevent="submit">
      <div class="space-y-1.5">
        <label class="text-sm font-medium">新密码</label>
        <input v-model="form.newPassword" type="password" class="input" required minlength="8" />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">确认密码</label>
        <input v-model="form.confirm" type="password" class="input" required minlength="8" />
      </div>
      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-if="ok" class="text-sm text-green-600">密码已重置，正在跳转登录…</p>
      <button class="btn-primary w-full" :disabled="loading" type="submit">
        {{ loading ? '处理中…' : '重置密码' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const api = useApi();
const csrf = useCsrf();

const form = reactive({ newPassword: '', confirm: '' });
const loading = ref(false);
const error = ref('');
const ok = ref(false);

async function submit() {
  error.value = '';
  if (form.newPassword !== form.confirm) {
    error.value = '两次密码不一致';
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
    setTimeout(() => navigateTo('/login'), 1500);
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } }).data?.message || '重置失败';
  } finally {
    loading.value = false;
  }
}
useHead({ title: '重置密码 — LIVE' });
</script>
