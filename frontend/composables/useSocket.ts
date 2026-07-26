import { io, type Socket } from 'socket.io-client';
import { getCurrentScope, onScopeDispose } from 'vue';

interface OnlineCountPayload { streamId: number; count: number }
interface LivePayload { id: number; slug: string; title: string }
interface MessageHistoryPayload {
  streamId: number;
  messages: import('./useApi').ChatMessage[];
}

// Client-only singleton. The Socket instance holds buffers, callbacks and
// internal maps — it must not be wrapped in deep reactivity (useState) nor
// serialized into the Nuxt payload. SSR is guarded in connect().
let socket: Socket | null = null;
// Last joinStream payload, replayed after socket.io auto-reconnects: the
// server loses room membership when the connection drops.
let lastJoinArgs: unknown[] | null = null;
let everConnected = false;

export function useSocket() {
  const config = useRuntimeConfig();
  const wsBase = config.public.wsBase as string;

  function connect(): Socket | null {
    if (import.meta.server) return null;
    if (socket) return socket;

    const s = io(wsBase, {
      transports: ['websocket'],
      withCredentials: true,
      // No `auth` callback here on purpose: the access_token cookie is
      // httpOnly and can never be read from JS. The gateway authenticates
      // the handshake via the Cookie header (chat.gateway.ts).
    });

    s.on('connect', () => {
      // Re-join the current room after an automatic reconnect. The very
      // first connect delivers the buffered joinStream emit by itself —
      // replaying it then would double-join and fetch history twice.
      if (everConnected && lastJoinArgs) {
        s.emit('joinStream', ...lastJoinArgs);
      }
      everConnected = true;
    });

    socket = s;
    return s;
  }

  function on(event: string, handler: (...args: unknown[]) => void) {
    const s = connect();
    if (!s) return () => {};
    s.on(event, handler);
    const off = () => {
      s.off(event, handler);
    };
    // Auto-remove the listener when the registering component/scope is
    // disposed, so revisiting pages does not stack duplicate handlers.
    if (getCurrentScope()) onScopeDispose(off);
    return off;
  }

  function emit(event: string, ...args: unknown[]) {
    const s = connect();
    if (!s) return;
    if (event === 'joinStream') lastJoinArgs = args;
    else if (event === 'leaveStream') lastJoinArgs = null;
    s.emit(event, ...args);
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    lastJoinArgs = null;
    everConnected = false;
  }

  return { connect, on, emit, disconnect };
}

export type { OnlineCountPayload, LivePayload, MessageHistoryPayload };
