import type { StreamPublic, StreamDetail, AdminStream } from './useApi';

export function useStreams() {
  const api = useApi();

  return {
    list: () => api.get<StreamPublic[]>('/api/streams'),
    bySlug: (slug: string) =>
      api.get<StreamDetail>(`/api/streams/by-slug/${encodeURIComponent(slug)}`),
    adminList: () => api.get<AdminStream[]>('/api/admin/streams'),
    create: (data: { title: string; description?: string; slug?: string }) =>
      api.post<AdminStream & { playback: unknown }>('/api/admin/streams', data),
    // 更新/删除路由在 StreamsController（/api/streams/:id，@Roles('ADMIN')），
    // AdminController 并未提供对应端点
    update: (id: number, data: { title?: string; description?: string; slug?: string }) =>
      api.patch<AdminStream>(`/api/streams/${id}`, data),
    remove: (id: number) => api.del<{ deleted: boolean }>(`/api/streams/${id}`),
    start: (id: number) =>
      api.post<{ id: number; slug: string; title: string; liveStatus: boolean }>(
        `/api/admin/streams/${id}/start`,
      ),
    stop: (id: number) =>
      api.post<{ id: number; slug: string; title: string; liveStatus: boolean }>(
        `/api/admin/streams/${id}/stop`,
      ),
  };
}
