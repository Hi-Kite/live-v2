interface CsrfState {
  token: string | null;
  loading: Promise<string | null> | null;
}

export function useCsrf() {
  const state = useState<CsrfState>('csrf', () => ({
    token: null,
    loading: null,
  }));

  async function fetchToken(): Promise<string | null> {
    try {
      const config = useRuntimeConfig();
      const data = await $fetch<{ token: string }>(
        '/api/auth/csrf-token',
        { baseURL: config.public.apiBase as string, credentials: 'include' },
      );
      state.value.token = data.token;
      return data.token;
    } catch {
      return null;
    }
  }

  function ensure(): Promise<string | null> {
    if (state.value.token) return Promise.resolve(state.value.token);
    if (!state.value.loading) {
      state.value.loading = fetchToken().finally(() => {
        state.value.loading = null;
      });
    }
    return state.value.loading;
  }

  function reset() {
    state.value.token = null;
  }

  return { ensure, reset, fetchToken };
}
