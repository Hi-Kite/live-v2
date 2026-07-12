<template>
  <div class="mx-auto flex max-w-md flex-col gap-6 py-10">
    <div class="text-center">
      <h1 class="text-2xl font-bold">注册账号</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">使用邀请码加入 LIVE</p>
    </div>

    <form class="card space-y-4 p-6" @submit.prevent="submit">
      <div class="space-y-1.5">
        <label class="text-sm font-medium">邀请码</label>
        <input v-model="form.inviteCode" class="input" required placeholder="邀请码" />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">邮箱</label>
        <input v-model="form.email" type="email" class="input" required placeholder="you@example.com" />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">用户名</label>
        <input v-model="form.username" class="input" required placeholder="3-20 位字母数字下划线" />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">密码</label>
        <input v-model="form.password" type="password" class="input" required placeholder="至少 8 位" />
      </div>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-if="ok" class="text-sm text-green-600 dark:text-green-400">
        注册成功！我们已向你的邮箱发送验证邮件，请查收。
      </p>

      <button class="btn-primary w-full" :disabled="loading" type="submit">
        {{ loading ? '注册中…' : '注册' }}
      </button>

      <div class="text-center text-sm">
        已有账号？<NuxtLink to="/login" class="text-brand-600 hover:underline">登录</NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const csrf = useCsrf();

const form = reactive({ inviteCode: '', email: '', username: '', password: '' });
const loading = ref(false);
const error = ref('');
const ok = ref(false);

async function submit() {
  error.value = '';
  ok.value = false;
  loading.value = true;
  try {
    await csrf.ensure();
    await api.post('/api/auth/register', form);
    ok.value = true;
    setTimeout(() => navigateTo('/login'), 2500);
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } }).data?.message || '注册失败';
  } finally {
    loading.value = false;
  }
}

useHead({ title: '注册 — LIVE' });
</script>
