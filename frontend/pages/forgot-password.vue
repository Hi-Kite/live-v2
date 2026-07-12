<template>
  <div class="mx-auto flex max-w-md flex-col gap-6 py-10">
    <div class="text-center">
      <h1 class="text-2xl font-bold">忘记密码</h1>
      <p class="mt-1 text-sm text-slate-500">输入注册邮箱，我们会发送重置链接</p>
    </div>
    <form class="card space-y-4 p-6" @submit.prevent="submit">
      <div class="space-y-1.5">
        <label class="text-sm font-medium">邮箱</label>
        <input v-model="email" type="email" class="input" required />
      </div>
      <p v-if="sent" class="text-sm text-green-600 dark:text-green-400">
        如果该邮箱已注册，重置链接已发送。
      </p>
      <button class="btn-primary w-full" :disabled="loading" type="submit">
        {{ loading ? '发送中…' : '发送重置链接' }}
      </button>
      <NuxtLink to="/login" class="block text-center text-sm text-brand-600 hover:underline">返回登录</NuxtLink>
    </form>
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const csrf = useCsrf();
const email = ref('');
const loading = ref(false);
const sent = ref(false);

async function submit() {
  loading.value = true;
  try {
    await csrf.ensure();
    await api.post('/api/auth/forgot-password', { email: email.value });
    sent.value = true;
  } finally {
    loading.value = false;
  }
}
useHead({ title: '忘记密码 — LIVE' });
</script>
