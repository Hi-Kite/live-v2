<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">直播间管理</h1>
      <UiButton @click="openCreate">新建直播间</UiButton>
    </div>
    <AdminNav />

    <!-- PK 对战管理 -->
    <section class="card space-y-3 p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold">主播对战（PK）</h2>
          <p class="mt-0.5 text-sm text-soft">
            对战期间两个直播间共享同一个聊天池，观众可在对战页为双方点赞。
          </p>
        </div>
        <UiBadge v-if="activePk" variant="live" dot pulse>对战进行中</UiBadge>
      </div>

      <template v-if="activePk">
        <div class="flex flex-wrap items-center gap-3 text-sm font-medium">
          <span>{{ pkTitle(activePk.streams[0]?.id) }}</span>
          <span class="text-xs font-black italic text-rose-500">VS</span>
          <span>{{ pkTitle(activePk.streams[1]?.id) }}</span>
        </div>
        <div class="flex gap-2">
          <UiButton variant="danger" size="sm" :loading="pkBusy" @click="endPk">结束对战</UiButton>
          <UiButton to="/pvp" variant="secondary" size="sm">查看对战页</UiButton>
        </div>
      </template>
      <template v-else>
        <div class="flex flex-wrap items-end gap-3">
          <UiFormField label="A 方" class="w-44">
            <template #default="{ id }">
              <select :id="id" v-model.number="pkA" class="input">
                <option :value="0" disabled>选择直播间</option>
                <option v-for="s in streams" :key="s.id" :value="s.id">{{ s.title }}</option>
              </select>
            </template>
          </UiFormField>
          <UiFormField label="B 方" class="w-44">
            <template #default="{ id }">
              <select :id="id" v-model.number="pkB" class="input">
                <option :value="0" disabled>选择直播间</option>
                <option v-for="s in streams" :key="s.id" :value="s.id" :disabled="s.id === pkA">
                  {{ s.title }}
                </option>
              </select>
            </template>
          </UiFormField>
          <UiButton :disabled="!pkA || !pkB || pkA === pkB" :loading="pkBusy" @click="startPk">
            发起对战
          </UiButton>
        </div>
        <p v-if="streams.length < 2" class="text-xs text-soft">需要至少两个直播间才能发起对战。</p>
      </template>
    </section>

    <UiTable :empty="!loading && !loadError && streams.length === 0" empty-text="还没有直播间，点击「新建直播间」创建">
      <template #head>
        <th>标题</th>
        <th>Slug</th>
        <th>推流密钥</th>
        <th>状态</th>
        <th class="text-right">操作</th>
      </template>

      <template v-if="loading">
        <tr v-for="i in 3" :key="i">
          <td><UiSkeleton class="h-4 w-28" /></td>
          <td><UiSkeleton class="h-4 w-20" /></td>
          <td><UiSkeleton class="h-4 w-24" /></td>
          <td><UiSkeleton class="h-4 w-14" /></td>
          <td><UiSkeleton class="ml-auto h-4 w-36" /></td>
        </tr>
      </template>
      <tr v-else-if="loadError">
        <td colspan="5" class="py-8 text-center">
          <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
          <UiButton class="mt-3" variant="secondary" size="sm" @click="load(true)">重试</UiButton>
        </td>
      </tr>
      <template v-else>
        <tr v-for="s in streams" :key="s.id">
          <td class="font-medium">{{ s.title }}</td>
          <td class="text-soft">{{ s.slug }}</td>
          <td class="whitespace-nowrap">
            <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{{ maskKey(s.streamKey) }}</code>
            <button class="ml-1 text-xs text-brand-600 hover:underline" type="button" @click="copyText(s.streamKey)">复制</button>
          </td>
          <td>
            <UiBadge :variant="s.liveStatus ? 'live' : 'offline'" :dot="s.liveStatus" :pulse="s.liveStatus">
              {{ s.liveStatus ? 'LIVE' : '离线' }}
            </UiBadge>
          </td>
          <td>
            <div class="flex justify-end gap-1">
              <UiButton
                v-if="!s.liveStatus"
                size="xs"
                :loading="busy[s.id] === 'start'"
                :disabled="!!busy[s.id]"
                @click="start(s)"
              >开播</UiButton>
              <UiButton
                v-else
                size="xs"
                variant="danger"
                :loading="busy[s.id] === 'stop'"
                :disabled="!!busy[s.id]"
                @click="stop(s)"
              >停播</UiButton>
              <UiButton size="xs" variant="secondary" :disabled="!!busy[s.id]" @click="showPush(s)">推流地址</UiButton>
              <UiButton
                size="xs"
                variant="ghost"
                :loading="busy[s.id] === 'delete'"
                :disabled="!!busy[s.id]"
                @click="confirmDelete(s)"
              >删除</UiButton>
            </div>
          </td>
        </tr>
      </template>
    </UiTable>

    <!-- create modal -->
    <UiModal v-model:model-value="createOpen" title="新建直播间">
      <form class="space-y-4" @submit.prevent="create">
        <UiFormField label="标题">
          <template #default="{ id }">
            <UiInput :id="id" v-model="form.title" required />
          </template>
        </UiFormField>
        <UiFormField label="Slug（可选）" hint="用于直播间地址，留空自动生成">
          <template #default="{ id }">
            <UiInput :id="id" v-model="form.slug" placeholder="留空自动生成" />
          </template>
        </UiFormField>
        <UiFormField label="描述">
          <template #default="{ id }">
            <UiTextarea :id="id" v-model="form.description" rows="3" />
          </template>
        </UiFormField>
        <p v-if="createError" class="text-sm text-red-600 dark:text-red-400">{{ createError }}</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" :disabled="creating" @click="createOpen = false">取消</UiButton>
        <UiButton :loading="creating" @click="create">创建</UiButton>
      </template>
    </UiModal>

    <!-- push url modal -->
    <UiModal
      v-model:model-value="pushOpen"
      size="lg"
      :title="pushInfo ? `${pushInfo.title} — 推流信息` : '推流信息'"
    >
      <template v-if="pushInfo">
        <p class="text-sm text-soft">在 OBS 的「设置 → 推流」中填写：</p>
        <div class="space-y-3 text-sm">
          <div>
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-xs text-soft">推流服务器 (Server)</span>
              <UiButton size="xs" variant="ghost" @click="copyText(pushServer)">复制</UiButton>
            </div>
            <code class="block break-all rounded bg-slate-100 p-2 dark:bg-slate-800">{{ pushServer || '加载中…' }}</code>
          </div>
          <div>
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-xs text-soft">推流密钥 (Stream Key)</span>
              <UiButton size="xs" variant="ghost" @click="copyText(pushStreamKey)">复制</UiButton>
            </div>
            <code class="block break-all rounded bg-slate-100 p-2 dark:bg-slate-800">{{ pushStreamKey }}</code>
          </div>
        </div>
        <p class="text-xs text-soft">
          提示：推流服务器地址按当前访问域名推导。若推流失败，请确认服务器防火墙已放行 1935 端口，且该域名解析指向推流服务器。
        </p>
      </template>
      <template #footer>
        <UiButton variant="secondary" @click="pushOpen = false">关闭</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import type { AdminStream, PkActive } from '~/composables/useApi';

definePageMeta({ middleware: 'admin' });

const api = useApi();
const streamsApi = useStreams();
const toast = useToast();
const { confirm } = useConfirm();

const streams = ref<AdminStream[]>([]);
const loading = ref(true);
const loadError = ref('');
const busy = reactive<Record<number, 'start' | 'stop' | 'delete' | undefined>>({});

const createOpen = ref(false);
const form = reactive({ title: '', slug: '', description: '' });
const creating = ref(false);
const createError = ref('');

const pushOpen = ref(false);
const pushInfo = ref<AdminStream | null>(null);
const rtmpUrl = ref('');

// 优先使用后端下发的推流信息（<slug>?key=<streamKey> 方案），旧字段作兜底
const pushServer = computed(() => pushInfo.value?.pushBase || rtmpUrl.value);
const pushStreamKey = computed(() => {
  const s = pushInfo.value;
  if (!s) return '';
  return s.pushKey || s.streamKey;
});

async function load(showLoading = false) {
  if (showLoading) loading.value = true;
  loadError.value = '';
  try {
    streams.value = await api.get<AdminStream[]>('/api/admin/streams');
  } catch (e: unknown) {
    loadError.value = apiErrorMessage(e, '直播间列表加载失败');
  } finally {
    loading.value = false;
  }
}

function maskKey(k: string): string {
  if (k.length <= 8) return k;
  return k.slice(0, 4) + '••••' + k.slice(-4);
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

function openCreate() {
  form.title = '';
  form.slug = '';
  form.description = '';
  createError.value = '';
  createOpen.value = true;
}

async function create() {
  if (creating.value) return;
  createError.value = '';
  creating.value = true;
  try {
    await streamsApi.create({
      title: form.title,
      slug: form.slug || undefined,
      description: form.description || undefined,
    });
    createOpen.value = false;
    toast.success('直播间已创建');
    await load();
  } catch (e: unknown) {
    createError.value = apiErrorMessage(e, '创建失败');
  } finally {
    creating.value = false;
  }
}

async function start(s: AdminStream) {
  busy[s.id] = 'start';
  try {
    await streamsApi.start(s.id);
    toast.success('已开播');
    await load();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '开播失败'));
  } finally {
    delete busy[s.id];
  }
}

async function stop(s: AdminStream) {
  busy[s.id] = 'stop';
  try {
    await streamsApi.stop(s.id);
    toast.success('已停播');
    await load();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '停播失败'));
  } finally {
    delete busy[s.id];
  }
}

function showPush(s: AdminStream) {
  pushInfo.value = s;
  pushOpen.value = true;
}

async function confirmDelete(s: AdminStream) {
  if (s.liveStatus) {
    toast.error('请先停播再删除');
    return;
  }
  const ok = await confirm({
    title: '删除直播间',
    message: `确定删除「${s.title}」？删除后不可恢复。`,
    danger: true,
    confirmText: '删除',
  });
  if (!ok) return;
  busy[s.id] = 'delete';
  try {
    await streamsApi.remove(s.id);
    toast.success('已删除');
    await load();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '删除失败'));
  } finally {
    delete busy[s.id];
  }
}

// ---------- PK 对战 ----------

const activePk = ref<PkActive | null>(null);
const pkA = ref(0);
const pkB = ref(0);
const pkBusy = ref(false);

function pkTitle(id?: number): string {
  return streams.value.find((s) => s.id === id)?.title || `#${id ?? '?'}`;
}

async function loadPk() {
  try {
    const res = await api.get<PkActive>('/api/streams/pk/active');
    activePk.value = res.session ? res : null;
  } catch {
    // 非核心信息，加载失败静默
  }
}

async function startPk() {
  if (pkBusy.value || !pkA.value || !pkB.value) return;
  pkBusy.value = true;
  try {
    await api.post('/api/streams/pk', { streamAId: pkA.value, streamBId: pkB.value });
    toast.success('对战已发起');
    await loadPk();
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '发起对战失败'));
  } finally {
    pkBusy.value = false;
  }
}

async function endPk() {
  const id = activePk.value?.session?.id;
  if (pkBusy.value || !id) return;
  pkBusy.value = true;
  try {
    await api.post(`/api/streams/pk/${id}/end`, {});
    toast.success('对战已结束');
    activePk.value = null;
    pkA.value = 0;
    pkB.value = 0;
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, '结束对战失败'));
  } finally {
    pkBusy.value = false;
  }
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    rtmpUrl.value = `rtmp://${window.location.hostname}:1935/live/`;
  }
  load(true);
  loadPk();
});

useHead({ title: '直播间管理 — 后台' });
</script>
