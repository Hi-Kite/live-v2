<template>
  <AuthShell title="订阅开播通知" subtitle="直播开始时，第一时间邮件提醒你">
    <div v-if="done" class="space-y-4 py-2 text-center">
      <div
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
      >
        <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 class="text-xl font-bold">订阅成功</h2>
      <p class="text-sm text-soft">开播时我们会第一时间发送邮件通知你。</p>
      <div class="flex flex-wrap justify-center gap-2 pt-1">
        <UiButton to="/">返回首页</UiButton>
        <UiButton variant="secondary" @click="reset">继续订阅其他邮箱</UiButton>
      </div>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <UiFormField label="邮箱">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
          />
        </template>
      </UiFormField>
      <UiFormField label="验证码" hint="看不清？点击图片刷新">
        <CaptchaWidget ref="captchaRef" v-model="code" @change="(p) => (captchaId = p.id)" />
      </UiFormField>
      <p v-if="errorMsg" class="text-sm text-red-600 dark:text-red-400">{{ errorMsg }}</p>
      <UiButton type="submit" block :loading="loading">订阅</UiButton>
    </form>

    <template #footer>可随时通过邮件中的链接退订</template>
  </AuthShell>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const csrf = useCsrf();
const toast = useToast();

const captchaRef = ref<{ refresh?: () => void } | null>(null);

const email = ref('');
const code = ref('');
const captchaId = ref('');
const loading = ref(false);
const errorMsg = ref('');
const done = ref(false);

async function submit() {
  if (loading.value) return;
  loading.value = true;
  errorMsg.value = '';
  try {
    await csrf.ensure();
    await $fetch('/api/subscriptions/subscribe', {
      baseURL: config.public.apiBase as string,
      method: 'POST',
      credentials: 'include',
      body: { email: email.value, captchaId: captchaId.value, captchaCode: code.value },
    });
    done.value = true;
    toast.success('订阅成功');
  } catch (e: unknown) {
    errorMsg.value = apiErrorMessage(e, '订阅失败，请稍后重试');
    captchaRef.value?.refresh?.();
  } finally {
    loading.value = false;
  }
}

function reset() {
  done.value = false;
  email.value = '';
  code.value = '';
  captchaId.value = '';
  errorMsg.value = '';
}

useHead({ title: '订阅 — LIVE' });
</script>
