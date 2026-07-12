<template>
  <div class="mx-auto max-w-md space-y-6 py-10">
    <div class="text-center">
      <h1 class="text-2xl font-bold">订阅开播通知</h1>
      <p class="mt-1 text-sm text-slate-500">直播开始时，第一时间邮件提醒你</p>
    </div>
    <form class="card space-y-4 p-6" @submit.prevent="submit">
      <div class="space-y-1.5">
        <label class="text-sm font-medium">邮箱</label>
        <input v-model="email" type="email" class="input" required placeholder="you@example.com" />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">验证码</label>
        <CaptchaWidget v-model="code" @change="(p) => (captchaId = p.id)" />
      </div>
      <p v-if="msg" :class="ok ? 'text-green-600' : 'text-red-600'" class="text-sm">{{ msg }}</p>
      <button class="btn-primary w-full" :disabled="loading" type="submit">
        {{ loading ? '提交中…' : '订阅' }}
      </button>
      <p class="text-center text-xs text-slate-400">可随时通过邮件中的链接退订</p>
    </form>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const csrf = useCsrf();

const email = ref('');
const code = ref('');
const captchaId = ref('');
const loading = ref(false);
const msg = ref('');
const ok = ref(false);

async function submit() {
  loading.value = true;
  msg.value = '';
  try {
    await csrf.ensure();
    await $fetch('/api/subscriptions/subscribe', {
      baseURL: config.public.apiBase as string,
      method: 'POST',
      credentials: 'include',
      body: { email: email.value, captchaId: captchaId.value, captchaCode: code.value },
    });
    ok.value = true;
    msg.value = '订阅成功！开播时我们会通知你。';
    email.value = '';
    code.value = '';
  } catch (e: unknown) {
    ok.value = false;
    msg.value = (e as { data?: { message?: string } }).data?.message || '订阅失败';
  } finally {
    loading.value = false;
  }
}
useHead({ title: '订阅 — LIVE' });
</script>
