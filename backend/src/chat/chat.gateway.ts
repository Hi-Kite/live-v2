import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';

interface AuthedSocket extends Socket {
  userId?: number;
  username?: string;
  role?: string;
}

/** Same allowlist convention as the HTTP CORS setup in main.ts. */
function allowedOrigins(): string[] {
  return (process.env.BACKEND_CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim());
}

/**
 * Chat flood control: max messages per user per window (PLAN.md spec).
 * Env-overridable to match docker-compose's RATE_LIMIT_MESSAGE_* knobs.
 */
const CHAT_RATE_LIMIT = Number(process.env.RATE_LIMIT_MESSAGE_LIMIT) || 10;
const CHAT_RATE_WINDOW_SECONDS = Number(process.env.RATE_LIMIT_MESSAGE_TTL) || 60;

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins().includes(origin)) cb(null, true);
      else cb(new Error(`Origin ${origin} not allowed`), false);
    },
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  public io!: Server;

  // streamId -> Set<socketId>
  private readonly rooms = new Map<number, Set<string>>();

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        client.handshake.headers?.cookie
          ?.split('; ')
          .find((c) => c.startsWith('access_token='))
          ?.split('=')[1];
      if (!token) {
        client.data.userId = null;
        return;
      }
      const payload = await this.jwt.verifyAsync(token);
      client.userId = payload.sub;
      client.username = payload.username;
      client.role = payload.role;
    } catch {
      client.data.userId = null;
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.leaveAllRooms(client);
  }

  /**
   * Remove the socket from every tracked stream room (bookkeeping Map and
   * the socket.io room alike), broadcasting the new online count for each
   * room it actually left. `except` skips one streamId (used on re-join).
   */
  private leaveAllRooms(client: AuthedSocket, except?: number) {
    for (const [sid, set] of this.rooms.entries()) {
      if (except !== undefined && sid === except) continue;
      if (set.delete(client.id)) {
        client.leave(`stream:${sid}`);
        if (set.size === 0) this.rooms.delete(sid);
        this.broadcastOnline(sid);
      }
    }
  }

  @SubscribeMessage('joinStream')
  async onJoin(
    @MessageBody() body: { streamId: number },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const streamId = Number(body?.streamId);
    if (!streamId) return;

    // leave previous stream rooms (socket.io rooms and bookkeeping)
    this.leaveAllRooms(client, streamId);

    if (!this.rooms.has(streamId)) this.rooms.set(streamId, new Set());
    this.rooms.get(streamId)!.add(client.id);
    client.join(`stream:${streamId}`);

    const history = await this.chat.listByStream(streamId);
    client.emit('messageHistory', { streamId, messages: history });
    this.broadcastOnline(streamId);
  }

  @SubscribeMessage('leaveStream')
  onLeave(@ConnectedSocket() client: AuthedSocket) {
    this.leaveAllRooms(client);
  }

  @SubscribeMessage('sendMessage')
  async onMessage(
    @MessageBody() body: { streamId: number; content: string },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Login required' });
      return;
    }
    const streamId = Number(body?.streamId);
    if (!streamId) return;

    const sent = await this.redis.incr(
      `chat:rate:${client.userId}`,
      CHAT_RATE_WINDOW_SECONDS,
    );
    if (sent > CHAT_RATE_LIMIT) {
      client.emit('error', { message: '发送太频繁，请稍后再试' });
      return;
    }

    const msg = await this.chat.send(streamId, client.userId, body.content);
    this.io.to(`stream:${streamId}`).emit('message', msg);
  }

  @SubscribeMessage('deleteMessage')
  async onDelete(
    @MessageBody() body: { messageId: number; streamId: number },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    if (client.role !== 'ADMIN') {
      client.emit('error', { message: 'Admin only' });
      return;
    }
    await this.chat.delete(Number(body.messageId));
    this.io
      .to(`stream:${Number(body.streamId)}`)
      .emit('messageDeleted', { id: body.messageId });
  }

  broadcastOnline(streamId: number) {
    const set = this.rooms.get(streamId);
    const count = set?.size ?? 0;
    this.io.emit('onlineCount', { streamId, count });
  }

  /** Called by admin when a stream goes live */
  announceLive(stream: {
    id: number;
    slug: string;
    title: string;
  }) {
    this.io.emit('streamStarted', stream);
  }

  announceStop(streamId: number) {
    this.io.emit('streamStopped', { streamId });
  }
}
