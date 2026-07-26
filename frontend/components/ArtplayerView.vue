<template>
  <div ref="wrapEl" class="player-wrap relative aspect-video w-full overflow-hidden bg-black">
    <!-- 视频区：全屏且聊天停靠展开时收缩宽度，控制栏/弹幕/等待层都只覆盖视频区 -->
    <!-- 与 dock 的 w-80 max-w-[85vw] 保持一致：窄屏全屏时按 85vw 收缩，视频不被挤没 -->
    <div class="relative h-full" :class="isFullscreen && dockOpen ? 'w-[calc(100%-min(20rem,85vw))]' : 'w-full'">
      <ClientOnly>
        <div ref="el" class="art-player h-full w-full" />

        <template #fallback>
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white">
            <div class="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p class="text-sm text-slate-300">加载播放器…</p>
          </div>
        </template>
      </ClientOnly>

      <div
        v-if="!playing && !actualLive"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600">
          <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <p class="text-sm text-slate-300">{{ waitingText }}</p>
        <UiButton :loading="reloading" @click="reload">重新加载</UiButton>
      </div>

      <slot name="overlay" />
    </div>

    <!-- 全屏时的聊天停靠区：页面通过 Teleport 把聊天面板注入这里 -->
    <div
      v-show="isFullscreen && dockOpen"
      ref="dockEl"
      class="absolute inset-y-0 right-0 z-30 flex w-80 max-w-[85vw]"
    />
    <button
      v-if="isFullscreen"
      type="button"
      class="absolute top-3 z-40 rounded-full bg-black/50 p-2 text-white backdrop-blur transition-all hover:bg-black/75"
      :class="dockOpen ? 'right-[21rem]' : 'right-3'"
      :aria-label="dockOpen ? '收起聊天' : '展开聊天'"
      :title="dockOpen ? '收起聊天' : '展开聊天'"
      @click="dockOpen = !dockOpen"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
type SourceKind = 'flv' | 'hls';

const props = withDefaults(
  defineProps<{
    src: string;
    kind?: SourceKind;
    actualLive?: boolean;
    muted?: boolean;
    waitingText?: string;
  }>(),
  {
    kind: 'flv',
    actualLive: false,
    muted: true,
    waitingText: '直播尚未开始，正在等待信号…',
  },
);

const emit = defineEmits<{
  ready: [art: unknown];
}>();

const toast = useToast();

const el = ref<HTMLDivElement | null>(null);
const wrapEl = ref<HTMLElement | null>(null);
const dockEl = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);
const dockOpen = ref(true);
const playing = ref(false);
const reloading = ref(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let art: any = null;

// Generation counter: bumped by destroy()/init() so any init() still awaiting
// a dynamic import (or a customType loader) can detect it became stale after
// a rapid src change or unmount, and bail out instead of attaching to a
// destroyed/orphaned instance.
let gen = 0;

async function buildCustomFlv(
  video: HTMLVideoElement,
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: any,
  stale: () => boolean,
  onSourceError: () => void,
) {
  const flvJs = (await import('flv.js')).default;
  if (stale()) return;
  if (flvJs.isSupported()) {
    const player = flvJs.createPlayer(
      { type: 'flv', url, isLive: true, cors: true },
      { enableWorker: false, lazyLoad: false },
    );
    player.on(flvJs.Events.ERROR, onSourceError);
    player.attachMediaElement(video);
    player.load();
    a.__flv = player;
  } else {
    video.src = url;
  }
}

async function buildHls(
  video: HTMLVideoElement,
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: any,
  stale: () => boolean,
  onSourceError: () => void,
) {
  const Hls = (await import('hls.js')).default;
  if (stale()) return;
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    return;
  }
  if (Hls.isSupported()) {
    const hls = new Hls({ lowLatencyMode: true, liveDurationInfinity: true });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data?.fatal) onSourceError();
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    a.__hls = hls;
  }
}

// 自定义全屏：把整个包装容器（含弹幕层与聊天停靠区）置全屏，而不是
// Artplayer 只全屏它自己的播放器元素——否则全屏后弹幕和聊天都会消失。
function onFsChange() {
  isFullscreen.value =
    !!document.fullscreenElement && document.fullscreenElement === wrapEl.value;
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement === wrapEl.value) {
      await document.exitFullscreen();
    } else {
      await wrapEl.value?.requestFullscreen();
    }
  } catch {
    toast.error('浏览器拒绝了全屏请求');
  }
}

const FULLSCREEN_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';

// video.load() would detach MSE (flv.js/hls.js), so a reload must rebuild
// the whole player instead.
async function reload() {
  if (reloading.value) return;
  reloading.value = true;
  try {
    destroy();
    await nextTick();
    await init();
  } finally {
    reloading.value = false;
  }
}

// auto-recover from fatal source errors with increasing backoff
let recoverTimer: ReturnType<typeof setTimeout> | null = null;
let recoverAttempts = 0;

function scheduleRecover(g: number) {
  if (g !== gen || recoverTimer) return;
  const delay = Math.min(3000 * 2 ** recoverAttempts, 30000);
  recoverAttempts++;
  recoverTimer = setTimeout(() => {
    recoverTimer = null;
    if (g !== gen) return;
    destroy();
    nextTick(init);
  }, delay);
}

async function init() {
  destroy();
  const g = ++gen;
  if (!el.value) return;

  let Artplayer: typeof import('artplayer').default;
  try {
    Artplayer = (await import('artplayer')).default;
  } catch (e) {
    if (g === gen) toast.error(apiErrorMessage(e, '播放器加载失败，请刷新页面重试'));
    return;
  }
  if (g !== gen || !el.value) return;

  const stale = () => g !== gen;
  const onSourceError = () => {
    if (!stale()) scheduleRecover(g);
  };

  art = new Artplayer({
    container: el.value,
    url: props.src,
    type: props.kind,
    isLive: true,
    autoplay: true,
    autoSize: false,
    autoMini: false,
    muted: props.muted,
    theme: '#1f5af0',
    lang: 'zh-cn',
    pip: false,
    screenshot: false,
    setting: false,
    // 原生全屏只会全屏播放器自身，弹幕/聊天会被排除在外 —— 用下方
    // 自定义控件把整个包装容器置全屏
    fullscreen: false,
    fullscreenWeb: false,
    playbackRate: false,
    aspectRatio: false,
    airplay: false,
    // 直播无需快捷键，且避免全屏聊天输入时空格触发暂停
    hotkey: false,
    controls: [
      {
        name: 'wrapFullscreen',
        position: 'right',
        html: FULLSCREEN_ICON,
        tooltip: '全屏',
        click: () => toggleFullscreen(),
      },
    ],
    customType: {
      flv: (video: HTMLVideoElement, url: string, a: unknown) =>
        buildCustomFlv(video, url, a, stale, onSourceError),
      m3u8: (video: HTMLVideoElement, url: string, a: unknown) =>
        buildHls(video, url, a, stale, onSourceError),
      hls: (video: HTMLVideoElement, url: string, a: unknown) =>
        buildHls(video, url, a, stale, onSourceError),
    },
  });

  art.on('ready', () => {
    if (stale()) return;
    playing.value = true;
    emit('ready', art);
    startBufferGuard();
  });
  art.on('video:playing', () => {
    playing.value = true;
    recoverAttempts = 0;
  });
  art.on('video:pause', () => (playing.value = false));
  art.on('video:waiting', () => (playing.value = false));
}

let guardTimer: ReturnType<typeof setInterval> | null = null;
function startBufferGuard() {
  if (guardTimer) clearInterval(guardTimer);
  guardTimer = setInterval(() => {
    if (!art) return;
    const video = art.video;
    if (!video.buffered || video.buffered.length === 0) return;
    const end = video.buffered.end(video.buffered.length - 1);
    const diff = end - video.currentTime;
    if (diff > 3) {
      video.currentTime = end - 1.5;
      video.playbackRate = 1;
    } else if (diff > 1) {
      video.playbackRate = Math.min(diff, 2);
    } else {
      video.playbackRate = 1;
    }
  }, 1000);
}

function destroy() {
  // invalidate any in-flight init() so it cannot attach after this point
  gen++;
  if (guardTimer) {
    clearInterval(guardTimer);
    guardTimer = null;
  }
  if (recoverTimer) {
    clearTimeout(recoverTimer);
    recoverTimer = null;
  }
  if (art) {
    // tear down MSE attachments before the player itself
    try {
      art.__flv?.destroy?.();
    } catch {
      // ignore
    }
    try {
      art.__hls?.destroy?.();
    } catch {
      // ignore
    }
    try {
      art.destroy(false);
    } catch {
      // ignore
    }
    art = null;
  }
  // art.destroy(false) keeps the player markup — empty the container so a
  // re-init never stacks stale DOM
  if (el.value) el.value.innerHTML = '';
  playing.value = false;
}

watch(
  () => props.src,
  () => {
    destroy();
    nextTick(init);
  },
);

// The container ref lives inside <ClientOnly>, whose slot is revealed in a
// re-render queued AFTER the parent's onMounted — so el is always null there.
// Init when the ref actually binds; onMounted covers the ref-already-bound case.
watch(el, (v) => {
  if (v && !art) init();
});

onMounted(() => {
  document.addEventListener('fullscreenchange', onFsChange);
  if (el.value && !art) init();
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange);
  destroy();
});

defineExpose({ dockEl, isFullscreen });
</script>

<style scoped>
/* 全屏时解除 16:9 约束，铺满屏幕 */
.player-wrap:fullscreen {
  aspect-ratio: auto;
  border-radius: 0;
}
</style>
