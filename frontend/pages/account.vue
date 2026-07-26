<template>
  <div class="mx-auto max-w-2xl space-y-6 py-6">
    <h1 class="text-2xl font-bold">账户中心</h1>

    <template v-if="auth.user">
      <!-- 资料 -->
      <section class="card space-y-4 p-6">
        <h2 class="text-lg font-bold">资料</h2>
        <div class="flex items-center gap-4">
          <div
            class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white"
            aria-hidden="true"
          >
            {{ auth.user.username.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="truncate text-lg font-bold">{{ auth.user.username }}</div>
            <div class="truncate text-sm text-soft">{{ auth.user.email }}</div>
            <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <UiBadge variant="neutral">{{ auth.user.role === 'ADMIN' ? '管理员' : '用户' }}</UiBadge>
              <UiBadge v-if="auth.user.emailVerified" variant="success">邮箱已验证</UiBadge>
              <UiBadge v-if="auth.user.twoFactorEnabled" variant="success" dot>2FA</UiBadge>
            </div>
          </div>
        </div>
      </section>

      <!-- 修改密码 -->
      <section class="card space-y-4 p-6">
        <h2 class="text-lg font-bold">修改密码</h2>
        <form class="space-y-4" @submit.prevent="changePw">
          <UiFormField label="当前密码">
            <template #default="{ id }">
              <UiInput
                :id="id"
                v-model="pw.currentPassword"
                type="password"
                autocomplete="current-password"
                required
              />
            </template>
          </UiFormField>
          <UiFormField label="新密码" hint="至少 8 位" :error="pwError">
            <template #default="{ id }">
              <UiInput
                :id="id"
                v-model="pw.newPassword"
                type="password"
                autocomplete="new-password"
                minlength="8"
                required
                :invalid="!!pwError"
              />
            </template>
          </UiFormField>
          <UiButton type="submit" :loading="pwLoading">保存</UiButton>
        </form>
      </section>

      <!-- 两步验证 -->
      <section v-if="auth.isAdmin" class="card space-y-4 p-6">
        <h2 class="text-lg font-bold">两步验证</h2>

        <template v-if="auth.user.twoFactorEnabled">
          <p class="text-sm text-green-600 dark:text-green-400">已启用 2FA。</p>
          <form class="flex items-start gap-2" @submit.prevent="disable2fa">
            <UiInput
              v-model="code2fa"
              class="flex-1"
              placeholder="输入 6 位验证码以关闭"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              required
            />
            <UiButton variant="danger" type="submit" :loading="twoFaLoading">关闭</UiButton>
          </form>
        </template>
        <template v-else-if="!qr">
          <p class="text-sm text-soft">启用两步验证（2FA）以增强后台安全。</p>
          <UiButton :loading="twoFaLoading" @click="setup2fa">生成密钥</UiButton>
        </template>
        <template v-else>
          <img :src="qr" alt="2FA 二维码" class="mx-auto h-48 w-48 rounded-lg bg-white p-2" />
          <p class="text-center text-xs text-soft">请用验证器扫码后输入 6 位验证码完成启用</p>
          <form class="flex items-start gap-2" @submit.prevent="verify2fa">
            <UiInput
              v-model="code2fa"
              class="flex-1"
              placeholder="6 位验证码"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              required
            />
            <UiButton type="submit" :loading="twoFaLoading">验证并启用</UiButton>
          </form>
        </template>
        <p v-if="twoFaError" class="text-sm text-red-600 dark:text-red-400">{{ twoFaError }}</p>
      </section>

      <!-- 危险区 -->
      <section class="card space-y-3 border-red-200 p-6 dark:border-red-900/60">
        <h2 class="text-lg font-bold text-red-600 dark:text-red-400">危险区</h2>
        <p class="text-sm text-soft">删除账号后，所有数据将被永久删除，且无法恢复。</p>
        <UiButton variant="danger" @click="openDelete">删除账号</UiButton>
      </section>
    </template>

    <UiModal v-model:model-value="showDelete" title="删除账号" size="sm">
      <p class="text-sm text-soft">
        此操作<strong class="font-semibold text-red-600 dark:text-red-400">不可恢复</strong>，你的所有数据将被永久删除。
      </p>
      <UiFormField :label="`请输入用户名「${auth.user?.username ?? ''}」以确认`">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="deleteInput"
            autocomplete="off"
            :placeholder="auth.user?.username"
          />
        </template>
      </UiFormField>
      <template #footer>
        <UiButton variant="secondary" :disabled="deleting" @click="showDelete = false">取消</UiButton>
        <UiButton variant="danger" :disabled="!canDelete" :loading="deleting" @click="doDelete">
          永久删除
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/composables/useAuth';

definePageMeta({ middleware: 'auth' });

const auth = useAuthStore();
const api = useApi();
const toast = useToast();

const pw = reactive({ currentPassword: '', newPassword: '' });
const pwError = ref('');
const pwLoading = ref(false);

const qr = ref('');
const code2fa = ref('');
const twoFaError = ref('');
const twoFaLoading = ref(false);

const showDelete = ref(false);
const deleteInput = ref('');
const deleting = ref(false);
const canDelete = computed(
  () => !!auth.user && deleteInput.value.trim() === auth.user.username,
);

async function changePw() {
  if (pwLoading.value) return;
  pwLoading.value = true;
  pwError.value = '';
  try {
    await api.post('/api/auth/change-password', { ...pw });
    toast.success('密码已更新');
    pw.currentPassword = '';
    pw.newPassword = '';
  } catch (e: unknown) {
    pwError.value = apiErrorMessage(e, '修改失败');
  } finally {
    pwLoading.value = false;
  }
}

async function setup2fa() {
  if (twoFaLoading.value) return;
  twoFaLoading.value = true;
  twoFaError.value = '';
  try {
    const data = await api.post<{ qr: string }>('/api/2fa/setup', {});
    qr.value = data.qr;
  } catch (e: unknown) {
    twoFaError.value = apiErrorMessage(e, '生成失败');
  } finally {
    twoFaLoading.value = false;
  }
}

async function verify2fa() {
  if (twoFaLoading.value) return;
  twoFaLoading.value = true;
  twoFaError.value = '';
  try {
    await api.post('/api/2fa/verify', { code: code2fa.value });
    toast.success('两步验证已启用');
    qr.value = '';
    code2fa.value = '';
    await auth.refresh();
  } catch (e: unknown) {
    twoFaError.value = apiErrorMessage(e, '验证失败');
  } finally {
    twoFaLoading.value = false;
  }
}

async function disable2fa() {
  if (twoFaLoading.value) return;
  twoFaLoading.value = true;
  twoFaError.value = '';
  try {
    await api.post('/api/2fa/disable', { code: code2fa.value });
    toast.success('两步验证已关闭');
    code2fa.value = '';
    await auth.refresh();
  } catch (e: unknown) {
    twoFaError.value = apiErrorMessage(e, '操作失败');
  } finally {
    twoFaLoading.value = false;
  }
}

function openDelete() {
  deleteInput.value = '';
  showDelete.value = true;
}

async function doDelete() {
  if (deleting.value || !canDelete.value) return;
  deleting.value = true;
  try {
    await api.del('/api/users/me');
    toast.success('账号已删除');
    showDelete.value = false;
    auth.clear();
    await navigateTo('/');
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '删除失败'));
  } finally {
    deleting.value = false;
  }
}

useHead({ title: '账户中心 — LIVE' });
</script>
