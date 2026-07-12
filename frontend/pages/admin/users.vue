<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">用户管理</h1>
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b text-left text-xs uppercase text-slate-400" :style="{ borderColor: 'var(--border)' }">
          <tr>
            <th class="px-4 py-3">ID</th>
            <th class="px-4 py-3">用户名</th>
            <th class="px-4 py-3">邮箱</th>
            <th class="px-4 py-3">角色</th>
            <th class="px-4 py-3">注册时间</th>
            <th class="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-b last:border-0" :style="{ borderColor: 'var(--border)' }">
            <td class="px-4 py-3 text-slate-400">{{ u.id }}</td>
            <td class="px-4 py-3 font-medium">{{ u.username }}</td>
            <td class="px-4 py-3 text-slate-500">{{ u.email }}</td>
            <td class="px-4 py-3">
              <span :class="u.role === 'ADMIN' ? 'badge-live' : 'badge-offline'">{{ u.role }}</span>
            </td>
            <td class="px-4 py-3 text-slate-400">{{ formatDate(u.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="u.role !== 'ADMIN'"
                class="btn-danger !px-2 !py-1 text-xs"
                @click="del(u.id)"
              >删除</button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-slate-400">暂无用户</td>
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

interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  createdAt: string;
}

const users = ref<AdminUser[]>([]);

async function load() {
  users.value = await api.get<AdminUser[]>('/api/admin/users');
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString('zh-CN');
}

async function del(id: number) {
  if (!confirm('确定删除该用户？')) return;
  await csrf.ensure();
  await api.del(`/api/admin/users/${id}`);
  await load();
}

onMounted(load);
useHead({ title: '用户管理 — 后台' });
</script>
