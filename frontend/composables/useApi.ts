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
  return config.public.apiBase as string;
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
