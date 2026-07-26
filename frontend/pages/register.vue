<template>
  <AuthShell title="注册账号" subtitle="使用邀请码加入 LIVE">
    <form class="space-y-4" @submit.prevent="submit">
      <UiFormField label="邀请码">
        <template #default="{ id }">
          <UiInput :id="id" v-model="form.inviteCode" required placeholder="邀请码" />
        </template>
      </UiFormField>

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

      <UiFormField label="用户名" :error="fieldErrors.username" hint="3-20 位，仅限字母、数字和下划线">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="form.username"
            required
            minlength="3"
            maxlength="20"
            pattern="[A-Za-z0-9_]{3,20}"
            autocomplete="username"
            :invalid="!!fieldErrors.username"
            placeholder="用户名"
          />
        </template>
      </UiFormField>

      <UiFormField label="密码" :error="fieldErrors.password" hint="至少 8 位">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="form.password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            :invalid="!!fieldErrors.password"
            placeholder="••••••••"
          />
        </template>
      </UiFormField>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <p v-if="ok" class="text-sm text-green-600 dark:text-green-400">
        注册成功！我们已向你的邮箱发送验证邮件，请查收。
      </p>

      <UiButton type="submit" block :loading="loading">
        {{ loading ? '注册中…' : '注册' }}
      </UiButton>
    </form>

    <template #footer>
      已有账号？<NuxtLink to="/login" class="text-brand-600 hover:underline">登录</NuxtLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
const api = useApi();
const csrf = useCsrf();
const toast = useToast();

const form = reactive({ inviteCode: '', email: '', username: '', password: '' });
const loading = ref(false);
const error = ref('');
const ok = ref(false);
const fieldErrors = reactive<{ username: string; password: string }>({
  username: '',
  password: '',
});

function validate(): boolean {
  fieldErrors.username = '';
  fieldErrors.password = '';
  if (!/^[A-Za-z0-9_]{3,20}$/.test(form.username)) {
    fieldErrors.username = '用户名需为 3-20 位字母、数字或下划线';
  }
  if (form.password.length < 8) {
    fieldErrors.password = '密码至少 8 位';
  }
  return !fieldErrors.username && !fieldErrors.password;
}

async function submit() {
  error.value = '';
  ok.value = false;
  if (!validate()) return;
  loading.value = true;
  try {
    await csrf.ensure();
    await api.post('/api/auth/register', form);
    ok.value = true;
    toast.success('注册成功，请查收验证邮件');
    setTimeout(() => navigateTo('/login'), 2500);
  } catch (e: unknown) {
    error.value = apiErrorMessage(e, '注册失败');
  } finally {
    loading.value = false;
  }
}

useHead({ title: '注册 — LIVE' });
</script>
