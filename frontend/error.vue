<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
    <div class="text-7xl font-black text-brand-600">{{ error?.statusCode || 500 }}</div>
    <h1 class="text-2xl font-bold">{{ message }}</h1>
    <NuxtLink to="/" class="btn-primary">返回首页</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

const message = computed(() => {
  const code = props.error?.statusCode;
  if (code === 404) return '您请求的页面不存在';
  if (code === 403) return '没有权限访问';
  return props.error?.message || '服务器开小差了';
});

useHead({ title: `${props.error?.statusCode || '错误'} — LIVE` });
</script>
