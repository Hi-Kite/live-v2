export default defineNuxtRouteMiddleware(async (to) => {
  // Auth state is established client-side only (httpOnly cookie +
  // /api/auth/me); never call the API during SSR.
  if (import.meta.server) return;
  const auth = useAuthStore();
  if (!auth.initialized) {
    // init() dedupes concurrent callers, so this shares the request with
    // app.vue's onMounted init.
    await auth.init();
  }
  if (!auth.isLoggedIn) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
