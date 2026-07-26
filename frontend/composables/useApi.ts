import type { FetchOptions } from 'ofetch';

export interface UserPublic {
  id: number;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  emailVerified: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface StreamPublic {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  liveStatus: boolean;
  actualLive: boolean;
  startedAt: string | null;
}

export interface StreamDetail extends StreamPublic {
  playback: { hls: string; flv: string; webrtc: string };
}

export interface ChatMessage {
  id: number;
  streamId: number;
  content: string;
  createdAt: string;
  user: { id: number; username: string };
}

export interface AdminStream {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  streamKey: string;
  /** OBS 推流服务器地址，如 rtmp://host:1935/live/（后端按 PUBLIC_RTMP_HOST/APP_URL 推导） */
  pushBase?: string;
  /** OBS 推流密钥，形如 <slug>?key=<streamKey> */
  pushKey?: string;
  liveStatus: boolean;
  startedAt: string | null;
  createdAt: string;
}

type Method =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS';

function getBase(): string {
  const config = useRuntimeConfig();
  if (import.meta.server) {
    const internal = (config as { apiInternal?: string }).apiInternal;
    if (internal) return internal;
  }
  return config.public.apiBase as string;
}

function errorStatus(e: unknown): number | undefined {
  const err = e as { status?: number; statusCode?: number } | null | undefined;
  return err?.status ?? err?.statusCode;
}

/**
 * Extract a human-readable message from an API error, falling back to the
 * given zh-CN text. class-validator errors arrive as string arrays and are
 * joined with '；'.
 */
export function apiErrorMessage(e: unknown, fallback: string): string {
  const msg = (e as { data?: { message?: unknown } } | null | undefined)?.data
    ?.message;
  if (Array.isArray(msg)) {
    const joined = msg
      .filter((m): m is string => typeof m === 'string' && m.length > 0)
      .join('；');
    return joined || fallback;
  }
  if (typeof msg === 'string' && msg) return msg;
  return fallback;
}

// Single-flight refresh: concurrent 401s share one POST /api/auth/refresh.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(base: string, csrfToken: string): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = $fetch('/api/auth/refresh', {
      baseURL: base,
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    })
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export function useApi() {
  const base = getBase();
  const csrf = useCsrf();

  async function request<T>(
    path: string,
    opts: FetchOptions = {},
  ): Promise<T> {
    const method = (opts.method as Method) || 'GET';
    const isStateful = !['GET', 'HEAD', 'OPTIONS'].includes(method);

    async function attempt(): Promise<T> {
      const headers: Record<string, string> = {
        ...(opts.headers as Record<string, string>),
      };
      if (isStateful) {
        const token = await csrf.ensure();
        if (token) headers['X-CSRF-Token'] = token;
      }

      return await $fetch<T>(path, {
        baseURL: base,
        credentials: 'include',
        ...opts,
        method,
        headers,
      });
    }

    try {
      return await attempt();
    } catch (e) {
      // A 403 on a mutation usually means the cached CSRF token went stale
      // (expired, or the session changed). Fetch a fresh token and retry
      // exactly once; if it still fails, surface the error to the caller.
      if (isStateful && errorStatus(e) === 403) {
        csrf.invalidate();
        return await attempt();
      }
      // 401: access cookie (15min) likely expired — try the refresh cookie
      // once, then replay. Auth endpoints themselves are excluded so a bad
      // login/refresh doesn't loop.
      if (
        import.meta.client &&
        errorStatus(e) === 401 &&
        !path.startsWith('/api/auth/')
      ) {
        const token = (await csrf.ensure()) || '';
        if (await tryRefreshSession(base, token)) {
          return await attempt();
        }
      }
      throw e;
    }
  }

  return {
    get: <T>(path: string, opts: FetchOptions = {}) =>
      request<T>(path, { ...opts, method: 'GET' }),
    post: <T>(path: string, body?: unknown, opts: FetchOptions = {}) =>
      request<T>(path, { ...opts, method: 'POST', body: body as Record<string, unknown> }),
    patch: <T>(path: string, body?: unknown, opts: FetchOptions = {}) =>
      request<T>(path, { ...opts, method: 'PATCH', body: body as Record<string, unknown> }),
    del: <T>(path: string, opts: FetchOptions = {}) =>
      request<T>(path, { ...opts, method: 'DELETE' }),
  };
}
