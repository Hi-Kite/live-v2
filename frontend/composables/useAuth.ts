import { defineStore } from 'pinia';
import type { UserPublic } from './useApi';

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
    async init() {
      if (this.initialized) return;
      try {
        const api = useApi();
        this.user = await api.get<UserPublic>('/api/auth/me');
      } catch {
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },
    async refresh() {
      try {
        const api = useApi();
        this.user = await api.get<UserPublic>('/api/auth/me');
      } catch {
        this.user = null;
      }
    },
    setUser(u: UserPublic | null) {
      this.user = u;
    },
    clear() {
      this.user = null;
    },
  },
});
