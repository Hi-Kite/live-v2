export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let nextId = 1;

export function useToast() {
  const toasts = useState<ToastItem[]>('toasts', () => []);

  function push(type: ToastItem['type'], message: string, duration = 3000) {
    if (import.meta.server) return;
    const id = nextId++;
    toasts.value = [...toasts.value, { id, type, message }];
    setTimeout(() => dismiss(id), duration);
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    dismiss,
    success: (msg: string, duration?: number) => push('success', msg, duration),
    error: (msg: string, duration?: number) => push('error', msg, duration ?? 4000),
    info: (msg: string, duration?: number) => push('info', msg, duration),
  };
}
