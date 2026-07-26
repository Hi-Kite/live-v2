<template>
  <div class="flex items-center gap-1.5" role="group" aria-label="弹幕字号">
    <span class="text-xs text-soft">弹幕</span>
    <div class="flex overflow-hidden rounded-lg border border-line">
      <button
        v-for="(cfg, key) in DANMAKU_SIZES"
        :key="key"
        type="button"
        class="px-2 py-1 text-xs transition-colors"
        :class="
          size === key
            ? 'bg-brand-500/15 font-semibold text-brand-600 dark:text-brand-400'
            : 'text-soft hover:bg-ink/5 hover:text-ink'
        "
        :aria-pressed="size === key"
        :title="`弹幕字号：${cfg.label}`"
        @click="set(key as DanmakuSize)"
      >
        {{ cfg.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DANMAKU_SIZES, type DanmakuSize } from '~/composables/useDanmakuSize';

const { size, set } = useDanmakuSize();
</script>
