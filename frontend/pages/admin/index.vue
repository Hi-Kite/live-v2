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

    <!-- 实时带宽 / 负载 -->
    <div class="card space-y-4 p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-bold">实时带宽 / 负载</h2>
        <span class="text-xs text-soft">每 5 秒自动刷新</span>
      </div>

      <div v-if="!metrics" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiSkeleton v-for="i in 4" :key="i" class="h-20 w-full" />
      </div>

      <template v-else>
        <p
          v-if="!metrics.srsOk"
          class="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          SRS 媒体服务器未连接——本地开发环境未运行 SRS 属正常现象；生产环境部署后这里会显示推流/分发带宽与负载。
        </p>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-line/70 p-4">
            <div class="text-sm text-soft">推流带宽（上行）</div>
            <div class="mt-1 text-2xl font-bold tabular-nums">{{ fmtKbps(metrics.totalRecvKbps) }}</div>
            <svg viewBox="0 0 100 28" preserveAspectRatio="none" class="mt-2 h-7 w-full text-brand-500" aria-hidden="true">
              <polyline :points="sparkPoints(recvHist)" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
          <div class="rounded-xl border border-line/70 p-4">
            <div class="text-sm text-soft">分发带宽（下行）</div>
            <div class="mt-1 text-2xl font-bold tabular-nums">{{ fmtKbps(metrics.totalSendKbps) }}</div>
            <svg viewBox="0 0 100 28" preserveAspectRatio="none" class="mt-2 h-7 w-full text-rose-500" aria-hidden="true">
              <polyline :points="sparkPoints(sendHist)" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
          <div class="rounded-xl border border-line/70 p-4">
            <div class="text-sm text-soft">播放连接</div>
            <div class="mt-1 text-2xl font-bold tabular-nums">{{ metrics.totalClients }}</div>
            <div class="mt-1 text-xs text-soft">SRS 当前连接的拉流客户端</div>
          </div>
          <div class="rounded-xl border border-line/70 p-4">
            <div class="text-sm text-soft">聊天在线</div>
            <div class="mt-1 text-2xl font-bold tabular-nums">{{ metrics.chatOnline }}</div>
            <div class="mt-1 text-xs text-soft">WebSocket 房间内人数</div>
          </div>
        </div>

        <p v-if="metrics.system" class="text-xs text-soft">
          SRS 进程：CPU {{ metrics.system.cpuPercent ?? '—' }}% · 内存 {{ metrics.system.memMB ?? '—' }} MB
          <template v-if="metrics.system.sysCpuPercent !== null">
            · 系统 CPU {{ metrics.system.sysCpuPercent }}%
          </template>
          <template v-if="metrics.system.connections !== null">
            · 连接数 {{ metrics.system.connections }}
          </template>
        </p>

        <div v-if="metrics.streams.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-line text-left text-xs text-soft">
                <th class="py-2 pr-4 font-medium">直播间</th>
                <th class="py-2 pr-4 font-medium">状态</th>
                <th class="py-2 pr-4 font-medium">画质</th>
                <th class="py-2 pr-4 font-medium">推流码率</th>
                <th class="py-2 pr-4 font-medium">分发码率</th>
                <th class="py-2 pr-4 font-medium">播放连接</th>
                <th class="py-2 font-medium">聊天在线</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in metrics.streams" :key="s.slug" class="border-b border-line/60 last:border-0">
                <td class="py-2 pr-4 font-medium">{{ s.title }}</td>
                <td class="py-2 pr-4">
                  <UiBadge :variant="s.publishing ? 'live' : 'offline'" :dot="s.publishing" :pulse="s.publishing">
                    {{ s.publishing ? '推流中' : '无信号' }}
                  </UiBadge>
                </td>
                <td class="py-2 pr-4 text-soft">
                  {{ s.video ? `${s.video.width}×${s.video.height} ${s.video.codec}` : '—' }}
                </td>
                <td class="py-2 pr-4 tabular-nums">{{ fmtKbps(s.recvKbps) }}</td>
                <td class="py-2 pr-4 tabular-nums">{{ fmtKbps(s.sendKbps) }}</td>
                <td class="py-2 pr-4 tabular-nums">{{ s.clients }}</td>
                <td class="py-2 tabular-nums">{{ s.chatOnline }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
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

// ---------- 实时带宽 / 负载 ----------

interface AdminMetrics {
  srsOk: boolean;
  totalSendKbps: number;
  totalRecvKbps: number;
  totalClients: number;
  chatOnline: number;
  system: {
    cpuPercent: number | null;
    memMB: number | null;
    sysCpuPercent: number | null;
    connections: number | null;
  } | null;
  streams: Array<{
    slug: string;
    title: string;
    publishing: boolean;
    clients: number;
    sendKbps: number;
    recvKbps: number;
    video: { codec: string; width: number; height: number } | null;
    chatOnline: number;
  }>;
  ts: number;
}

const metrics = ref<AdminMetrics | null>(null);
const sendHist = ref<number[]>([]);
const recvHist = ref<number[]>([]);
let metricsTimer: ReturnType<typeof setInterval> | null = null;

async function loadMetrics() {
  try {
    const m = await api.get<AdminMetrics>('/api/admin/metrics');
    metrics.value = m;
    sendHist.value = [...sendHist.value.slice(-59), m.totalSendKbps];
    recvHist.value = [...recvHist.value.slice(-59), m.totalRecvKbps];
  } catch {
    // 保留上一次数据，避免临时抖动清空面板
  }
}

function fmtKbps(k: number): string {
  return k >= 1000 ? `${(k / 1000).toFixed(1)} Mbps` : `${Math.round(k)} kbps`;
}

/** 折线图坐标：按历史最大值归一化到 100×28 视口 */
function sparkPoints(hist: number[]): string {
  if (hist.length < 2) return '';
  const max = Math.max(...hist, 1);
  const h = 28;
  return hist
    .map((v, i) => `${((i / (hist.length - 1)) * 100).toFixed(1)},${(h - 1 - (v / max) * (h - 2)).toFixed(1)}`)
    .join(' ');
}

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

onMounted(() => {
  load();
  loadMetrics();
  metricsTimer = setInterval(() => {
    if (!document.hidden) loadMetrics();
  }, 5000);
});

onUnmounted(() => {
  if (metricsTimer) clearInterval(metricsTimer);
});

useHead({ title: '概览 — 后台' });
</script>
