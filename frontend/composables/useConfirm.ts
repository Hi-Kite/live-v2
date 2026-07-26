export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

let resolver: ((ok: boolean) => void) | null = null;

export function useConfirm() {
  const state = useState<ConfirmState>('confirm-dialog', () => ({
    open: false,
    message: '',
  }));

  function confirm(options: ConfirmOptions): Promise<boolean> {
    if (import.meta.server) return Promise.resolve(false);
    resolver?.(false);
    state.value = { open: true, ...options };
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function settle(ok: boolean) {
    state.value = { ...state.value, open: false };
    resolver?.(ok);
    resolver = null;
  }

  return { state, confirm, settle };
}
