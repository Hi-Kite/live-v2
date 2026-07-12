<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">直播间管理</h1>
      <button class="btn-primary" @click="openCreate">新建直播间</button>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b text-left text-xs uppercase text-slate-400" :style="{ borderColor: 'var(--border)' }">
          <tr>
            <th class="px-4 py-3">标题</th>
            <th class="px-4 py-3">Slug</th>
            <th class="px-4 py-3">推流密钥</th>
            <th class="px-4 py-3">状态</th>
            <th class="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in streams" :key="s.id" class="border-b last:border-0" :style="{ borderColor: 'var(--border)' }">
            <td class="px-4 py-3 font-medium">{{ s.title }}</td>
            <td class="px-4 py-3 text-slate-500">{{ s.slug }}</td>
            <td class="px-4 py-3">
              <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{{ maskKey(s.streamKey) }}</code>
              <button class="ml-1 text-xs text-brand-600 hover:underline" @click="copy(s.streamKey)">复制</button>
            </td>
            <td class="px-4 py-3"><LiveBadge :live="s.liveStatus" /></td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button v-if="!s.liveStatus" class="btn-primary !px-2 !py-1 text-xs" @click="start(s)">开播</button>
                <button v-else class="btn-danger !px-2 !py-1 text-xs" @click="stop(s)">停播</button>
                <button class="btn-secondary !px-2 !py-1 text-xs" @click="showPush(s)">推流地址</button>
                <button class="btn-ghost !px-2 !py-1 text-xs" @click="confirmDelete(s)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="streams.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-sm text-slate-400">还没有直播间</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- create modal -->
    <div v-if="modal === 'create'" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="modal = ''">
      <div class="card w-full max-w-md space-y-4 p-6">
        <h2 class="text-lg font-bold">新建直播间</h2>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">标题</label>
          <input v-model="form.title" class="input" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Slug (可选)</label>
          <input v-model="form.slug" class="input" placeholder="留空自动生成" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">描述</label>
          <textarea v-model="form.description" class="input" rows="3" />
        </div>
        <p v-if="err" class="text-sm text-red-600">{{ err }}</p>
        <div class="flex gap-2">
          <button class="btn-primary flex-1" :disabled="creating" @click="create">{{ creating ? '创建中…' : '创建' }}</button>
          <button class="btn-secondary" @click="modal = ''">取消</button>
        </div>
      </div>
    </div>

    <!-- push url modal -->
    <div v-if="modal === 'push' && pushInfo" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="modal = ''">
      <div class="card w-full max-w-lg space-y-3 p-6">
        <h2 class="text-lg font-bold">{{ pushInfo.title }} — 推流信息</h2>
        <p class="text-sm text-slate-500">在 OBS 中配置：</p>
        <div class="space-y-2 text-sm">
          <div>
            <div class="text-xs text-slate-400">推流服务器 (Server)</div>
            <code class="block rounded bg-slate-100 p-2 dark:bg-slate-800">rtmp://&lt;your-srs-host&gt;:1935/live/</code>
          </div>
          <div>
            <div class="text-xs text-slate-400">推流密钥 (Stream Key)</div>
            <code class="block rounded bg-slate-100 p-2 dark:bg-slate-800">{{ pushInfo.streamKey }}</code>
          </div>
        </div>
        <button class="btn-secondary w-full" @click="modal = ''">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminStream } from '~/composables/useApi';

definePageMeta({ middleware: 'admin' });

const api = useApi();
const streamsApi = useStreams();
const csrf = useCsrf();

const streams = ref<AdminStream[]>([]);
const modal = ref<'' | 'create' | 'push'>('');
const form = reactive({ title: '', slug: '', description: '' });
const creating = ref(false);
const err = ref('');
const pushInfo = ref<AdminStream | null>(null);

async function load() {
  streams.value = await api.get<AdminStream[]>('/api/admin/streams');
}

function maskKey(k: string): string {
  if (k.length <= 8) return k;
  return k.slice(0, 4) + '••••' + k.slice(-4);
}

async function copy(s: string) {
  try {
    await navigator.clipboard.writeText(s);
  } catch {
    // ignore
  }
}

function openCreate() {
  form.title = '';
  form.slug = '';
  form.description = '';
  err.value = '';
  modal.value = 'create';
}

async function create() {
  err.value = '';
  creating.value = true;
  try {
    await csrf.ensure();
    await streamsApi.create({
      title: form.title,
      slug: form.slug || undefined,
      description: form.description || undefined,
    });
    modal.value = '';
    await load();
  } catch (e: unknown) {
    err.value = (e as { data?: { message?: string } }).data?.message || '创建失败';
  } finally {
    creating.value = false;
  }
}

async function start(s: AdminStream) {
  await csrf.ensure();
  await streamsApi.start(s.id);
  await load();
}

async function stop(s: AdminStream) {
  await csrf.ensure();
  await streamsApi.stop(s.id);
  await load();
}

function showPush(s: AdminStream) {
  pushInfo.value = s;
  modal.value = 'push';
}

async function confirmDelete(s: AdminStream) {
  if (!confirm(`确定删除「${s.title}」？`)) return;
  if (s.liveStatus) {
    alert('请先停播再删除');
    return;
  }
  await csrf.ensure();
  await streamsApi.remove(s.id);
  await load();
}

onMounted(load);
useHead({ title: '直播间管理 — 后台' });
</script>
