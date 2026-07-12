<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">邀请码</h1>
      <button class="btn-primary" :disabled="creating" @click="generate">
        {{ creating ? '生成中…' : '生成邀请码' }}
      </button>
    </div>

    <div v-if="newlyCreated" class="card p-4">
      <p class="text-sm text-slate-500">新邀请码（点击复制）：</p>
      <code class="mt-1 block cursor-pointer rounded bg-slate-100 p-3 text-lg font-bold dark:bg-slate-800" @click="copy(newlyCreated)">
        {{ newlyCreated }}
      </code>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b text-left text-xs uppercase text-slate-400" :style="{ borderColor: 'var(--border)' }">
          <tr>
            <th class="px-4 py-3">邀请码</th>
            <th class="px-4 py-3">状态</th>
            <th class="px-4 py-3">使用者</th>
            <th class="px-4 py-3">创建时间</th>
            <th class="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in codes" :key="c.code" class="border-b last:border-0" :style="{ borderColor: 'var(--border)' }">
            <td class="px-4 py-3">
              <code class="font-mono">{{ c.code }}</code>
              <button class="ml-2 text-xs text-brand-600 hover:underline" @click="copy(c.code)">复制</button>
            </td>
            <td class="px-4 py-3">
              <span :class="c.usedById ? 'badge-offline' : 'badge-live'">{{ c.usedById ? '已使用' : '可用' }}</span>
            </td>
            <td class="px-4 py-3 text-slate-500">{{ c.usedBy?.username || '—' }}</td>
            <td class="px-4 py-3 text-slate-400">{{ formatDate(c.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <button v-if="!c.usedById" class="btn-ghost !px-2 !py-1 text-xs text-red-500" @click="revoke(c.code)">撤销</button>
            </td>
          </tr>
          <tr v-if="codes.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-slate-400">暂无邀请码</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' });

const api = useApi();
const csrf = useCsrf();

interface InviteCode {
  code: string;
  usedById: number | null;
  usedBy: { id: number; username: string } | null;
  usedAt: string | null;
  createdAt: string;
}

const codes = ref<InviteCode[]>([]);
const newlyCreated = ref('');
const creating = ref(false);

async function load() {
  codes.value = await api.get<InviteCode[]>('/api/admin/invite-codes');
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString('zh-CN');
}

async function copy(s: string) {
  try {
    await navigator.clipboard.writeText(s);
  } catch {
    // ignore
  }
}

async function generate() {
  creating.value = true;
  try {
    await csrf.ensure();
    const c = await api.post<InviteCode>('/api/admin/invite-codes', {});
    newlyCreated.value = c.code;
    await load();
  } finally {
    creating.value = false;
  }
}

async function revoke(code: string) {
  if (!confirm(`撤销邀请码「${code}」？`)) return;
  await csrf.ensure();
  await api.del(`/api/admin/invite-codes/${code}`);
  await load();
}

onMounted(load);
useHead({ title: '邀请码 — 后台' });
</script>
