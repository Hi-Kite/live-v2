<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">后台管理</h1>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NuxtLink to="/admin/streams" class="card p-5 transition hover:shadow-md">
        <div class="text-sm text-slate-500">直播间</div>
        <div class="mt-1 text-2xl font-bold">{{ stats.streams }}</div>
        <div class="mt-1 text-xs text-green-600">{{ stats.liveStreams }} 个直播中</div>
      </NuxtLink>
      <NuxtLink to="/admin/users" class="card p-5 transition hover:shadow-md">
        <div class="text-sm text-slate-500">用户</div>
        <div class="mt-1 text-2xl font-bold">{{ stats.users }}</div>
      </NuxtLink>
      <NuxtLink to="/admin/invite-codes" class="card p-5 transition hover:shadow-md">
        <div class="text-sm text-slate-500">邀请码</div>
        <div class="mt-1 text-2xl font-bold">{{ stats.inviteUnused }}</div>
        <div class="mt-1 text-xs text-slate-400">未使用</div>
      </NuxtLink>
      <div class="card p-5">
        <div class="text-sm text-slate-500">订阅者</div>
        <div class="mt-1 text-2xl font-bold">—</div>
        <div class="mt-1 text-xs text-slate-400">通过邮件统计</div>
      </div>
    </div>

    <div class="card p-6">
      <h2 class="mb-3 text-lg font-bold">快速操作</h2>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/admin/streams" class="btn-primary">管理直播间</NuxtLink>
        <NuxtLink to="/admin/users" class="btn-secondary">用户管理</NuxtLink>
        <NuxtLink to="/admin/invite-codes" class="btn-secondary">邀请码</NuxtLink>
        <NuxtLink to="/account" class="btn-secondary">两步验证</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' });

const api = useApi();

const stats = reactive({
  streams: 0,
  liveStreams: 0,
  users: 0,
  inviteUnused: 0,
});

onMounted(async () => {
  const [streams, users, invites] = await Promise.all([
    api.get<{ liveStatus: boolean }[]>('/api/admin/streams'),
    api.get<unknown[]>('/api/admin/users'),
    api.get<{ usedById: number | null }[]>('/api/admin/invite-codes'),
  ]);
  stats.streams = streams.length;
  stats.liveStreams = streams.filter((s) => s.liveStatus).length;
  stats.users = users.length;
  stats.inviteUnused = invites.filter((i) => !i.usedById).length;
});

useHead({ title: '后台 — LIVE' });
</script>
