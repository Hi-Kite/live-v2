<template>
  <header
    class="sticky top-0 z-30 border-b backdrop-blur-md"
    :style="{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--bg-elev) 85%, transparent)' }"
  >
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-6">
        <AppLogo />
        <nav class="hidden items-center gap-1 sm:flex">
          <NuxtLink to="/" class="btn-ghost text-sm" active-class="!text-brand-600">直播</NuxtLink>
          <NuxtLink to="/pvp" class="btn-ghost text-sm" active-class="!text-brand-600">多路</NuxtLink>
          <NuxtLink to="/subscribe" class="btn-ghost text-sm" active-class="!text-brand-600">订阅</NuxtLink>
          <NuxtLink v-if="auth.isAdmin" to="/admin" class="btn-ghost text-sm" active-class="!text-brand-600">后台</NuxtLink>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="btn-ghost !p-2"
          :title="theme.isDark.value ? '切换到浅色' : '切换到深色'"
          @click="theme.toggle()"
        >
          <svg v-if="theme.isDark.value" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>

        <template v-if="!auth.initialized">
          <div class="h-8 w-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        </template>
        <template v-else-if="auth.isLoggedIn">
          <NuxtLink to="/account" class="btn-secondary text-sm">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {{ auth.user?.username.charAt(0).toUpperCase() }}
            </span>
            <span class="hidden sm:inline">{{ auth.user?.username }}</span>
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="btn-ghost text-sm">登录</NuxtLink>
          <NuxtLink to="/register" class="btn-primary text-sm">注册</NuxtLink>
        </template>
      </div>
    </div>

    <!-- mobile nav -->
    <nav class="flex items-center gap-1 border-t px-4 py-2 sm:hidden" :style="{ borderColor: 'var(--border)' }">
      <NuxtLink to="/" class="btn-ghost text-sm flex-1 justify-center" active-class="!text-brand-600">直播</NuxtLink>
      <NuxtLink to="/pvp" class="btn-ghost text-sm flex-1 justify-center" active-class="!text-brand-600">多路</NuxtLink>
      <NuxtLink to="/subscribe" class="btn-ghost text-sm flex-1 justify-center" active-class="!text-brand-600">订阅</NuxtLink>
      <NuxtLink v-if="auth.isAdmin" to="/admin" class="btn-ghost text-sm flex-1 justify-center" active-class="!text-brand-600">后台</NuxtLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/composables/useAuth';

const auth = useAuthStore();
const theme = useTheme();
</script>
