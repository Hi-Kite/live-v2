<template>
  <div class="mx-auto max-w-2xl space-y-6 py-6">
    <h1 class="text-2xl font-bold">账户中心</h1>

    <div v-if="auth.user" class="card space-y-5 p-6">
      <div class="flex items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
          {{ auth.user.username.charAt(0).toUpperCase() }}
        </div>
        <div>
          <div class="text-lg font-bold">{{ auth.user.username }}</div>
          <div class="text-sm text-slate-500">{{ auth.user.email }}</div>
          <div class="mt-1 flex items-center gap-2 text-xs">
            <span class="rounded bg-slate-100 px-2 py-0.5 font-medium dark:bg-slate-800">
              {{ auth.user.role === 'ADMIN' ? '管理员' : '用户' }}
            </span>
            <span v-if="auth.user.emailVerified" class="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
              已验证
            </span>
            <span v-if="auth.user.twoFactorEnabled" class="rounded bg-brand-100 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              2FA
            </span>
          </div>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <button class="btn-secondary" @click="showChange = !showChange">
          {{ showChange ? '取消' : '修改密码' }}
        </button>
        <button v-if="auth.isAdmin" class="btn-secondary" @click="show2fa = !show2fa">
          {{ show2fa ? '收起' : '两步验证' }}
        </button>
        <button class="btn-danger sm:col-span-2" @click="confirmDelete">删除账号</button>
      </div>
    </div>

    <div v-if="showChange" class="card space-y-4 p-6">
      <h2 class="text-lg font-bold">修改密码</h2>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">当前密码</label>
        <input v-model="pw.currentPassword" type="password" class="input" />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">新密码</label>
        <input v-model="pw.newPassword" type="password" class="input" />
      </div>
      <p v-if="pwMsg" :class="pwOk ? 'text-green-600' : 'text-red-600'" class="text-sm">{{ pwMsg }}</p>
      <button class="btn-primary" :disabled="pwLoading" @click="changePw">保存</button>
    </div>

    <div v-if="show2fa && auth.isAdmin" class="card space-y-4 p-6">
      <h2 class="text-lg font-bold">两步验证</h2>
      <template v-if="!auth.user?.twoFactorEnabled">
        <template v-if="!qr">
          <p class="text-sm text-slate-500">启用 2FA 增强后台安全。</p>
          <button class="btn-primary" @click="setup2fa">生成密钥</button>
        </template>
      <template v-else>
        <p class="text-sm text-green-600">已启用 2FA。</p>
          <img :src="qr" alt="2FA QR" class="mx-auto h-48 w-48" />
          <p class="text-center text-xs text-slate-500">使用 Google Authenticator / Authy 扫描</p>
          <div class="flex gap-2">
            <input v-model="code2fa" class="input" placeholder="6 位验证码" />
            <button class="btn-primary" @click="verify2fa">验证并启用</button>
          </div>
        </template>
      </template>
      <template v-else>
        <div class="flex gap-2">
          <input v-model="code2fa" class="input" placeholder="输入验证码以关闭" />
          <button class="btn-danger" @click="disable2fa">关闭</button>
        </div>
      </template>
      <p v-if="msg2fa" class="text-sm" :class="ok2fa ? 'text-green-600' : 'text-red-600'">{{ msg2fa }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/composables/useAuth';

definePageMeta({ middleware: 'auth' });

const auth = useAuthStore();
const api = useApi();
const csrf = useCsrf();

const showChange = ref(false);
const show2fa = ref(false);
const pw = reactive({ currentPassword: '', newPassword: '' });
const pwMsg = ref('');
const pwOk = ref(false);
const pwLoading = ref(false);

const qr = ref('');
const code2fa = ref('');
const msg2fa = ref('');
const ok2fa = ref(false);

async function changePw() {
  pwLoading.value = true;
  pwMsg.value = '';
  try {
    await csrf.ensure();
    await api.post('/api/auth/change-password', pw);
    pwOk.value = true;
    pwMsg.value = '密码已更新';
    pw.currentPassword = '';
    pw.newPassword = '';
  } catch (e: unknown) {
    pwOk.value = false;
    pwMsg.value = (e as { data?: { message?: string } }).data?.message || '修改失败';
  } finally {
    pwLoading.value = false;
  }
}

async function setup2fa() {
  try {
    await csrf.ensure();
    const data = await api.post<{ qr: string }>('/api/2fa/setup', {});
    qr.value = data.qr;
  } catch (e: unknown) {
    msg2fa.value = (e as { data?: { message?: string } }).data?.message || '生成失败';
    ok2fa.value = false;
  }
}

async function verify2fa() {
  try {
    await csrf.ensure();
    await api.post('/api/2fa/verify', { code: code2fa.value });
    msg2fa.value = '已启用';
    ok2fa.value = true;
    auth.refresh();
  } catch (e: unknown) {
    msg2fa.value = (e as { data?: { message?: string } }).data?.message || '验证失败';
    ok2fa.value = false;
  }
}

async function disable2fa() {
  try {
    await csrf.ensure();
    await api.post('/api/2fa/disable', { code: code2fa.value });
    msg2fa.value = '已关闭';
    ok2fa.value = true;
    auth.refresh();
  } catch (e: unknown) {
    msg2fa.value = (e as { data?: { message?: string } }).data?.message || '操作失败';
    ok2fa.value = false;
  }
}

async function confirmDelete() {
  if (!confirm('确定删除账号？此操作不可恢复。')) return;
  if (!confirm('再次确认：所有数据将被永久删除。')) return;
  await csrf.ensure();
  await api.del('/api/users/me');
  auth.clear();
  await navigateTo('/');
}

useHead({ title: '账户中心 — LIVE' });
</script>
