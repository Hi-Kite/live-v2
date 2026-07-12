export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore();
  if (import.meta.server) return;
  if (!auth.initialized) {
    return new Promise<void>((resolve) => {
      const stop = watch(
        () => auth.initialized,
        (ready) => {
          if (ready) {
            stop();
            check();
            resolve();
          }
        },
        { immediate: true },
      );
    });
  }
  check();

  function check() {
    if (!auth.isAdmin) {
      return navigateTo('/');
    }
  }
});
