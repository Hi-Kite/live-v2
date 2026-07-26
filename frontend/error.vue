<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-6 bg-page p-6 text-center text-ink">
    <p class="text-7xl font-black leading-none text-brand-600 sm:text-8xl">{{ code }}</p>
    <div class="space-y-2">
      <h1 class="text-2xl font-bold">{{ message }}</h1>
      <p class="text-sm text-soft">您可以返回首页，或刷新页面重试。</p>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <UiButton @click="goHome">返回首页</UiButton>
      <UiButton variant="secondary" @click="reload">刷新</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

const code = computed(() => props.error?.statusCode || 500);

const message = computed(() => {
  if (code.value === 404) return '您请求的页面不存在';
  if (code.value === 403) return '没有权限访问';
  return props.error?.message || '服务器开小差了';
});

function goHome() {
  clearError({ redirect: '/' });
}

function reload() {
  if (import.meta.client) window.location.reload();
}

useHead({ title: `${props.error?.statusCode || '错误'} — LIVE` });
</script>
