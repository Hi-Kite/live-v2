<template>
  <footer
    class="border-t py-6 text-center text-xs text-slate-500 dark:text-slate-400"
    :style="{ borderColor: 'var(--border)' }"
  >
    <div
      class="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 sm:flex-row sm:justify-center sm:gap-4 sm:px-6 lg:px-8"
    >
      <p>© {{ year }} {{ appName }} · 现代化直播平台</p>
      <a
        v-if="icpNumber"
        :href="icpUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-brand-600"
      >{{ icpNumber }}</a>
      <a
        v-if="mpsNumber"
        :href="mpsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 hover:text-brand-600"
      >
        <span aria-hidden="true">🇨🇳</span>{{ mpsNumber }}
      </a>
    </div>
  </footer>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();

const appName = computed(() => (config.public.appName as string) || 'LIVE');
const icpNumber = computed(() => (config.public.icpNumber as string) || '');
const icpUrl = computed(() => (config.public.icpUrl as string) || 'https://beian.miit.gov.cn');
const mpsNumber = computed(() => (config.public.mpsNumber as string) || '');
const mpsUrl = computed(() => (config.public.mpsUrl as string) || 'http://www.beian.gov.cn');

const year = new Date().getFullYear();
</script>
