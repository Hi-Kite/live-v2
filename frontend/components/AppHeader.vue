<template>
  <header class="sticky top-0 z-30 border-b border-line/60 bg-surface/70 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-6">
        <AppLogo />
        <nav class="hidden items-center gap-1 sm:flex">
          <NuxtLink to="/" class="nav-link" active-class="nav-link-active">直播</NuxtLink>
          <NuxtLink to="/pvp" class="nav-link" active-class="nav-link-active">对战</NuxtLink>
          <NuxtLink to="/subscribe" class="nav-link" active-class="nav-link-active">订阅</NuxtLink>
          <NuxtLink v-if="auth.isAdmin" to="/admin" class="nav-link" active-class="nav-link-active">后台</NuxtLink>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="btn-ghost !p-2"
          :aria-label="theme.isDark.value ? '切换到浅色模式' : '切换到深色模式'"
          :aria-pressed="theme.isDark.value"
          :title="theme.isDark.value ? '切换到浅色' : '切换到深色'"
          @click="theme.toggle()"
        >
          <svg v-if="theme.isDark.value" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>

        <template v-if="!auth.initialized">
          <UiSkeleton class="h-8 w-20" />
        </template>
        <template v-else-if="auth.isLoggedIn">
          <NuxtLink to="/account" class="btn-secondary text-sm" aria-label="个人中心">
            <UiAvatar :name="auth.user?.username || '?'" size="sm" />
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
    <nav class="flex items-center gap-1 border-t border-line/60 px-4 py-2 sm:hidden">
      <NuxtLink to="/" class="nav-link flex-1 text-center" active-class="nav-link-active">直播</NuxtLink>
      <NuxtLink to="/pvp" class="nav-link flex-1 text-center" active-class="nav-link-active">对战</NuxtLink>
      <NuxtLink to="/subscribe" class="nav-link flex-1 text-center" active-class="nav-link-active">订阅</NuxtLink>
      <NuxtLink v-if="auth.isAdmin" to="/admin" class="nav-link flex-1 text-center" active-class="nav-link-active">后台</NuxtLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/composables/useAuth';

const auth = useAuthStore();
const theme = useTheme();
</script>
