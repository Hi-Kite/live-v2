<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">邀请码</h1>
      <UiButton :loading="creating" @click="generate">生成邀请码</UiButton>
    </div>
    <AdminNav />

    <div v-if="newlyCreated" class="card p-4">
      <p class="text-sm text-soft">新邀请码（点击复制）：</p>
      <code
        class="mt-1 block cursor-pointer break-all rounded bg-slate-100 p-3 text-lg font-bold dark:bg-slate-800"
        @click="copyText(newlyCreated)"
      >{{ newlyCreated }}</code>
    </div>

    <UiTable :empty="!loading && !loadError && codes.length === 0" empty-text="暂无邀请码，点击「生成邀请码」创建">
      <template #head>
        <th>邀请码</th>
        <th>状态</th>
        <th>使用者</th>
        <th>创建时间</th>
        <th class="text-right">操作</th>
      </template>

      <template v-if="loading">
        <tr v-for="i in 3" :key="i">
          <td><UiSkeleton class="h-4 w-32" /></td>
          <td><UiSkeleton class="h-4 w-12" /></td>
          <td><UiSkeleton class="h-4 w-20" /></td>
          <td><UiSkeleton class="h-4 w-32" /></td>
          <td><UiSkeleton class="ml-auto h-4 w-12" /></td>
        </tr>
      </template>
      <tr v-else-if="loadError">
        <td colspan="5" class="py-8 text-center">
          <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
          <UiButton class="mt-3" variant="secondary" size="sm" @click="load(true)">重试</UiButton>
        </td>
      </tr>
      <template v-else>
        <tr v-for="c in codes" :key="c.code">
          <td class="whitespace-nowrap">
            <code class="font-mono">{{ c.code }}</code>
            <button class="ml-2 text-xs text-brand-600 hover:underline" type="button" @click="copyText(c.code)">复制</button>
          </td>
          <td>
            <UiBadge :variant="c.usedById ? 'neutral' : 'success'">{{ c.usedById ? '已使用' : '可用' }}</UiBadge>
          </td>
          <td class="text-soft">{{ c.usedBy?.username || '—' }}</td>
          <td class="whitespace-nowrap text-soft">{{ formatDate(c.createdAt) }}</td>
          <td class="text-right">
            <UiButton
              v-if="!c.usedById"
              size="xs"
              variant="ghost"
              class="!text-red-600 dark:!text-red-400"
              :loading="!!busy[c.code]"
              @click="revoke(c)"
            >撤销</UiButton>
          </td>
        </tr>
      </template>
    </UiTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' });

const api = useApi();
const toast = useToast();
const { confirm } = useConfirm();

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
const loading = ref(true);
const loadError = ref('');
const busy = reactive<Record<string, boolean>>({});

async function load(showLoading = false) {
  if (showLoading) loading.value = true;
  loadError.value = '';
  try {
    codes.value = await api.get<InviteCode[]>('/api/admin/invite-codes');
  } catch (e: unknown) {
    loadError.value = apiErrorMessage(e, '邀请码列表加载失败');
  } finally {
    loading.value = false;
  }
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString('zh-CN');
}

async function copyText(s: string) {
  if (!s) return;
  try {
    await navigator.clipboard.writeText(s);
    toast.success('已复制');
  } catch {
    toast.error('复制失败，请手动选择复制');
  }
}

async function generate() {
  if (creating.value) return;
  creating.value = true;
  try {
    const c = await api.post<InviteCode>('/api/admin/invite-codes', {});
    newlyCreated.value = c.code;
    toast.success('邀请码已生成');
    await load();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '生成失败'));
  } finally {
    creating.value = false;
  }
}

async function revoke(c: InviteCode) {
  const ok = await confirm({
    title: '撤销邀请码',
    message: `确定撤销邀请码「${c.code}」？撤销后该邀请码将无法使用。`,
    danger: true,
    confirmText: '撤销',
  });
  if (!ok) return;
  busy[c.code] = true;
  try {
    await api.del(`/api/admin/invite-codes/${c.code}`);
    toast.success('已撤销');
    if (newlyCreated.value === c.code) newlyCreated.value = '';
    await load();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '撤销失败'));
  } finally {
    delete busy[c.code];
  }
}

onMounted(() => load(true));
useHead({ title: '邀请码 — 后台' });
</script>
