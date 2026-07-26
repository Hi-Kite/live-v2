<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">用户管理</h1>
    <AdminNav />

    <UiTable :empty="!loading && !loadError && users.length === 0" empty-text="暂无用户">
      <template #head>
        <th>ID</th>
        <th>用户名</th>
        <th>邮箱</th>
        <th>角色</th>
        <th>注册时间</th>
        <th class="text-right">操作</th>
      </template>

      <template v-if="loading">
        <tr v-for="i in 3" :key="i">
          <td><UiSkeleton class="h-4 w-8" /></td>
          <td><UiSkeleton class="h-4 w-20" /></td>
          <td><UiSkeleton class="h-4 w-40" /></td>
          <td><UiSkeleton class="h-4 w-14" /></td>
          <td><UiSkeleton class="h-4 w-32" /></td>
          <td><UiSkeleton class="ml-auto h-4 w-12" /></td>
        </tr>
      </template>
      <tr v-else-if="loadError">
        <td colspan="6" class="py-8 text-center">
          <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
          <UiButton class="mt-3" variant="secondary" size="sm" @click="load(true)">重试</UiButton>
        </td>
      </tr>
      <template v-else>
        <tr v-for="u in users" :key="u.id">
          <td class="text-soft">{{ u.id }}</td>
          <td class="font-medium">{{ u.username }}</td>
          <td class="text-soft">{{ u.email }}</td>
          <td>
            <UiBadge :variant="u.role === 'ADMIN' ? 'danger' : 'neutral'">{{ u.role }}</UiBadge>
          </td>
          <td class="whitespace-nowrap text-soft">{{ formatDate(u.createdAt) }}</td>
          <td class="text-right">
            <UiButton
              v-if="u.role !== 'ADMIN'"
              size="xs"
              variant="danger"
              :loading="!!busy[u.id]"
              @click="del(u)"
            >删除</UiButton>
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

interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  createdAt: string;
}

const users = ref<AdminUser[]>([]);
const loading = ref(true);
const loadError = ref('');
const busy = reactive<Record<number, boolean>>({});

async function load(showLoading = false) {
  if (showLoading) loading.value = true;
  loadError.value = '';
  try {
    users.value = await api.get<AdminUser[]>('/api/admin/users');
  } catch (e: unknown) {
    loadError.value = apiErrorMessage(e, '用户列表加载失败');
  } finally {
    loading.value = false;
  }
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString('zh-CN');
}

async function del(u: AdminUser) {
  const ok = await confirm({
    title: '删除用户',
    message: `确定删除用户「${u.username}」？删除后不可恢复。`,
    danger: true,
    confirmText: '删除',
  });
  if (!ok) return;
  busy[u.id] = true;
  try {
    await api.del(`/api/admin/users/${u.id}`);
    toast.success('已删除');
    await load();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '删除失败'));
  } finally {
    delete busy[u.id];
  }
}

onMounted(() => load(true));
useHead({ title: '用户管理 — 后台' });
</script>
