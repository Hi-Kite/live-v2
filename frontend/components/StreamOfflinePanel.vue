<template>
  <div class="relative flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden bg-[#0a0a12] text-white">
    <!-- ambient glows -->
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_75%_at_50%_0%,rgb(99_102_241/0.22),transparent_70%)]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[120%] -translate-x-1/2 bg-[radial-gradient(50%_100%_at_50%_100%,rgb(99_102_241/0.12),transparent_70%)]"
      aria-hidden="true"
    />

    <div class="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] backdrop-blur">
      <span
        class="absolute inset-0 rounded-full border border-brand-400/50 animate-ping-slow motion-reduce:animate-none"
        aria-hidden="true"
      />
      <svg viewBox="0 0 24 24" class="h-7 w-7 translate-x-0.5 text-brand-300" fill="currentColor" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
    <div class="relative space-y-1 text-center">
      <p class="text-sm font-medium text-slate-200">{{ title || '直播未开始' }}</p>
      <p class="text-xs text-slate-500">{{ subtitle || '开播后将自动播放' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string }>();
</script>
