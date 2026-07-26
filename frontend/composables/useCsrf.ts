// The in-flight fetch lives outside useState on purpose: a Promise is
// neither serializable into the Nuxt payload nor useful as deep-reactive
// state. ensure() is client-only, so a module-level variable is safe.
let pending: Promise<string | null> | null = null;

export function useCsrf() {
  const token = useState<string | null>('csrf-token', () => null);

  async function fetchToken(): Promise<string | null> {
    try {
      const config = useRuntimeConfig();
      const data = await $fetch<{ token: string }>(
        '/api/auth/csrf-token',
        { baseURL: config.public.apiBase as string, credentials: 'include' },
      );
      token.value = data.token;
      return data.token;
    } catch {
      return null;
    }
  }

  function ensure(): Promise<string | null> {
    if (import.meta.server) return Promise.resolve(null);
    if (token.value) return Promise.resolve(token.value);
    if (!pending) {
      pending = fetchToken().finally(() => {
        pending = null;
      });
    }
    return pending;
  }

  /**
   * Drop the cached token so the next mutation fetches a fresh one.
   * Called by useApi on a 403 (stale token) and by the auth store when the
   * session changes (login/logout).
   */
  function invalidate() {
    token.value = null;
  }

  return { ensure, invalidate, reset: invalidate, fetchToken };
}
