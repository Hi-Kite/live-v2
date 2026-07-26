export default defineNuxtRouteMiddleware(async () => {
  // Auth state is established client-side only (httpOnly cookie +
  // /api/auth/me); never call the API during SSR.
  if (import.meta.server) return;
  const auth = useAuthStore();
  if (!auth.initialized) {
    // init() dedupes concurrent callers, so this shares the request with
    // app.vue's onMounted init.
    await auth.init();
  }
  if (!auth.isAdmin) {
    return navigateTo('/');
  }
});
