import { defineStore } from 'pinia';
import type { UserPublic } from './useApi';

// Shared across concurrent init() callers (route middleware + app.vue
// onMounted): they all await the same /api/auth/me request.
let initPromise: Promise<void> | null = null;

function errorStatus(e: unknown): number | undefined {
  const err = e as { status?: number; statusCode?: number } | null | undefined;
  return err?.status ?? err?.statusCode;
}

function invalidateCsrf() {
  try {
    useCsrf().invalidate();
  } catch {
    // outside of a Nuxt context — nothing to invalidate
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserPublic | null,
    initialized: false,
  }),
  getters: {
    isLoggedIn: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'ADMIN',
  },
  actions: {
    async init(): Promise<void> {
      if (this.initialized) return;
      if (initPromise) return initPromise;
      initPromise = (async () => {
        try {
          const api = useApi();
          this.user = await api.get<UserPublic>('/api/auth/me');
        } catch (e) {
          // Only a real auth failure means "logged out"; on network errors
          // keep the previous state instead of silently dropping the user.
          const status = errorStatus(e);
          if (status === 401 || status === 403) this.user = null;
        } finally {
          this.initialized = true;
          initPromise = null;
        }
      })();
      return initPromise;
    },
    async refresh() {
      try {
        const api = useApi();
        this.user = await api.get<UserPublic>('/api/auth/me');
      } catch (e) {
        const status = errorStatus(e);
        if (status === 401 || status === 403) this.user = null;
      }
    },
    setUser(u: UserPublic | null) {
      this.user = u;
      // Session changed (login) — a cached CSRF token may belong to the old
      // session; drop it so the next mutation fetches a fresh one.
      invalidateCsrf();
    },
    clear() {
      this.user = null;
      invalidateCsrf();
    },
  },
});
