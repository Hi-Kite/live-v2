<template>
  <div class="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
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
    fullscreen: true,
    fullscreenWeb: true,
    playbackRate: false,
    aspectRatio: false,
    airplay: false,
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
  if (el.value && !art) init();
});

onBeforeUnmount(() => {
  destroy();
});
</script>
