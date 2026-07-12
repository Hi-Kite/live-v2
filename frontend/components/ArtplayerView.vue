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
        <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div>
      <p class="text-sm text-slate-300">{{ waitingText }}</p>
      <button class="btn-primary" @click="reload">重新加载</button>
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

type ArtplayerInstance = {
  video: HTMLVideoElement & { load?: () => void };
  destroy: (clear?: boolean) => void;
  on: (event: string, handler: () => void) => void;
  [key: string]: unknown;
};

const emit = defineEmits<{
  ready: [art: unknown];
}>();

const el = ref<HTMLDivElement | null>(null);
const playing = ref(false);
let art: ArtplayerInstance | null = null;

async function buildCustomFlv(
  ArtplayerMod: typeof import('artplayer').default,
  video: HTMLVideoElement,
  url: string,
  a: ArtplayerInstance,
) {
  const flvJs = (await import('flv.js')).default;
  if (flvJs.isSupported()) {
    const player = flvJs.createPlayer(
      { type: 'flv', url, isLive: true, cors: true },
      { enableWorker: false, lazyLoad: false },
    );
    player.attachMediaElement(video);
    player.load();
    (a as ArtplayerInstance & { __flv?: { destroy: () => void } }).__flv = player;
  } else {
    video.src = url;
  }
}

async function buildHls(video: HTMLVideoElement, url: string, a: ArtplayerInstance) {
  const Hls = (await import('hls.js')).default;
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    return;
  }
  if (Hls.isSupported()) {
    const hls = new Hls({ lowLatencyMode: true, liveDurationInfinity: true });
    hls.loadSource(url);
    hls.attachMedia(video);
    (a as ArtplayerInstance & { __hls?: { destroy: () => void } }).__hls = hls;
  }
}

function reload() {
  if (!art) return;
  const v = art.video;
  try {
    v?.load?.();
    v?.play?.().catch(() => {});
  } catch {
    // ignore
  }
}

async function init() {
  if (!el.value) return;
  const Artplayer = (await import('artplayer')).default;

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
      flv: (video: HTMLVideoElement, url: string, a: ArtplayerInstance) =>
        buildCustomFlv(Artplayer, video, url, a),
      m3u8: (video: HTMLVideoElement, url: string, a: ArtplayerInstance) =>
        buildHls(video, url, a),
      hls: (video: HTMLVideoElement, url: string, a: ArtplayerInstance) =>
        buildHls(video, url, a),
    },
  }) as unknown as ArtplayerInstance;

  art.on('ready', () => {
    playing.value = true;
    emit('ready', art);
    startBufferGuard();
  });
  art.on('video:playing', () => (playing.value = true));
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
  if (guardTimer) {
    clearInterval(guardTimer);
    guardTimer = null;
  }
  if (art) {
    const a = art as ArtplayerInstance & {
      __flv?: { destroy: () => void };
      __hls?: { destroy: () => void };
    };
    a.__flv?.destroy?.();
    a.__hls?.destroy?.();
    art.destroy(false);
    art = null;
  }
}

watch(
  () => props.src,
  () => {
    destroy();
    nextTick(init);
  },
);

onMounted(() => {
  init();
});

onBeforeUnmount(() => {
  destroy();
});
</script>
