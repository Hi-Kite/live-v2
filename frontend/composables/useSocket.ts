import { io, type Socket } from 'socket.io-client';

interface OnlineCountPayload { streamId: number; count: number }
interface LivePayload { id: number; slug: string; title: string }
interface MessageHistoryPayload {
  streamId: number;
  messages: import('./useApi').ChatMessage[];
}

export function useSocket() {
  const config = useRuntimeConfig();
  const wsBase = config.public.wsBase as string;

  const socket = useState<Socket | null>('socket', () => null);

  function connect() {
    if (socket.value && socket.value.connected) return socket.value;
    if (import.meta.server) return null;

    const s = io(wsBase, {
      transports: ['websocket'],
      withCredentials: true,
      auth: (cb) => {
        const token = useCookie('access_token').value;
        cb({ token });
      },
    });
    socket.value = s;
    return s;
  }

  function on(event: string, handler: (...args: unknown[]) => void) {
    const s = connect();
    if (!s) return () => {};
    s.on(event, handler as (...args: unknown[]) => void);
    return () => s.off(event, handler as (...args: unknown[]) => void);
  }

  function emit(event: string, ...args: unknown[]) {
    const s = connect();
    if (s) s.emit(event, ...args);
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
  }

  return { connect, on, emit, disconnect };
}

export type { OnlineCountPayload, LivePayload, MessageHistoryPayload };
