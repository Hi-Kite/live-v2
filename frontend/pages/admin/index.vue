<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">后台管理</h1>
    <AdminNav />

    <div
      v-if="loadError"
      class="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
      <UiButton variant="secondary" size="sm" :loading="loading" @click="load">重试</UiButton>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NuxtLink to="/admin/streams" class="card p-5 transition hover:shadow-md">
        <div class="text-sm text-soft">直播间</div>
        <template v-if="loading">
          <UiSkeleton class="mt-2 h-7 w-14" />
          <UiSkeleton class="mt-2 h-3 w-20" />
        </template>
        <template v-else>
          <div class="mt-1 text-2xl font-bold">{{ stats.streams }}</div>
          <div class="mt-1 text-xs text-green-600 dark:text-green-400">{{ stats.liveStreams }} 个直播中</div>
        </template>
      </NuxtLink>
      <NuxtLink to="/admin/users" class="card p-5 transition hover:shadow-md">
        <div class="text-sm text-soft">用户</div>
        <UiSkeleton v-if="loading" class="mt-2 h-7 w-14" />
        <div v-else class="mt-1 text-2xl font-bold">{{ stats.users }}</div>
      </NuxtLink>
      <NuxtLink to="/admin/invite-codes" class="card p-5 transition hover:shadow-md">
        <div class="text-sm text-soft">邀请码</div>
        <template v-if="loading">
          <UiSkeleton class="mt-2 h-7 w-14" />
          <UiSkeleton class="mt-2 h-3 w-12" />
        </template>
        <template v-else>
          <div class="mt-1 text-2xl font-bold">{{ stats.inviteUnused }}</div>
          <div class="mt-1 text-xs text-soft">未使用</div>
        </template>
      </NuxtLink>
      <div class="card p-5">
        <div class="text-sm text-soft">订阅者</div>
        <div class="mt-1 text-2xl font-bold text-soft">—</div>
        <div class="mt-1 text-xs text-soft">开播提醒通过邮件订阅发送，人数暂不在后台统计</div>
      </div>
    </div>

    <div class="card p-6">
      <h2 class="mb-3 text-lg font-bold">快速操作</h2>
      <div class="flex flex-wrap gap-2">
        <UiButton variant="secondary" to="/admin/streams">管理直播间</UiButton>
        <UiButton variant="secondary" to="/admin/users">用户管理</UiButton>
        <UiButton variant="secondary" to="/admin/invite-codes">邀请码</UiButton>
        <UiButton variant="secondary" to="/account">两步验证</UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' });

const api = useApi();
const toast = useToast();

const stats = reactive({
  streams: 0,
  liveStreams: 0,
  users: 0,
  inviteUnused: 0,
});
const loading = ref(true);
const loadError = ref('');

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const [streams, users, invites] = await Promise.all([
      api.get<{ liveStatus: boolean }[]>('/api/admin/streams'),
      api.get<unknown[]>('/api/admin/users'),
      api.get<{ usedById: number | null }[]>('/api/admin/invite-codes'),
    ]);
    stats.streams = streams.length;
    stats.liveStreams = streams.filter((s) => s.liveStatus).length;
    stats.users = users.length;
    stats.inviteUnused = invites.filter((i) => !i.usedById).length;
  } catch (e: unknown) {
    loadError.value = apiErrorMessage(e, '统计数据加载失败');
    toast.error(loadError.value);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
useHead({ title: '概览 — 后台' });
</script>
