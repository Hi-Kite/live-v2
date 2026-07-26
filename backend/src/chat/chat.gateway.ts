import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
import { PrismaService } from '../prisma/prisma.service';

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

/** 点赞限流：每用户每 10 秒最多 30 次（连点动画友好，但挡脚本） */
const LIKE_RATE_LIMIT = 30;
const LIKE_RATE_WINDOW_SECONDS = 10;

/** joinStream 频控：匿名可用且触发 DB 查询，必须限速（每 socket 每 10 秒） */
const JOIN_RATE_LIMIT = 10;
const JOIN_RATE_WINDOW_SECONDS = 10;

/** 禁言时长上限：30 天 */
const MUTE_MAX_MINUTES = 30 * 24 * 60;

/** 聊天池（PK 会话）内存缓存 TTL；PK 开始/结束时会主动失效 */
const POOL_CACHE_TTL_MS = 10_000;

/** 禁言状态 Redis 缓存 TTL 上限（秒）：避免每条消息查库 */
const MUTE_CACHE_MAX_TTL_SECONDS = 60;

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
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  public io!: Server;

  private readonly log = new Logger(ChatGateway.name);

  // streamId -> Set<socketId>
  private readonly rooms = new Map<number, Set<string>>();

  // 高频事件的合并缓冲：点赞计数与在线人数按秒批量落库/广播，
  // 把 O(事件数 × 连接数) 的扇出压成 O(直播间数 × 连接数)/秒
  private readonly pendingLikes = new Map<number, number>();
  private readonly pendingOnline = new Set<number>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  // streamId -> 聊天池缓存
  private readonly poolCache = new Map<number, { expires: number; pool: number[] }>();

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.flushTimer = setInterval(() => void this.flushPending(), 1000);
  }

  async onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flushPending();
  }

  private async flushPending() {
    if (this.pendingLikes.size > 0) {
      const likes = [...this.pendingLikes.entries()];
      this.pendingLikes.clear();
      for (const [streamId, n] of likes) {
        try {
          const s = await this.prisma.stream.update({
            where: { id: streamId },
            data: { likeCount: { increment: n } },
            select: { likeCount: true },
          });
          this.io.emit('likeCount', { streamId, count: s.likeCount });
        } catch (e) {
          this.log.warn(
            `like flush failed for stream ${streamId} (+${n}): ${(e as Error).message}`,
          );
        }
      }
    }
    if (this.pendingOnline.size > 0) {
      const dirty = [...this.pendingOnline];
      this.pendingOnline.clear();
      for (const sid of dirty) {
        this.io.emit('onlineCount', { streamId: sid, count: this.rooms.get(sid)?.size ?? 0 });
      }
    }
  }

  /**
   * 聊天池：直播间正处于活跃 PK 时，池覆盖对战双方；否则只有自己。
   * 短 TTL 内存缓存 + PK 开始/结束时主动失效，避免每条消息查库。
   */
  private async poolFor(streamId: number): Promise<number[]> {
    const cached = this.poolCache.get(streamId);
    if (cached && cached.expires > Date.now()) return cached.pool;

    const pk = await this.prisma.pkSession.findFirst({
      where: {
        active: true,
        OR: [{ streamAId: streamId }, { streamBId: streamId }],
      },
      orderBy: { createdAt: 'desc' },
    });
    const pool = pk ? [pk.streamAId, pk.streamBId] : [streamId];
    this.poolCache.set(streamId, { expires: Date.now() + POOL_CACHE_TTL_MS, pool });
    return pool;
  }

  private invalidatePoolCache() {
    this.poolCache.clear();
  }

  /** 禁言状态查询：Redis 短缓存挡掉逐消息 DB 查询；禁言/解禁时同步写缓存 */
  private async isMuted(userId: number): Promise<boolean> {
    const cached = await this.redis.get(`chat:mutecache:${userId}`);
    if (cached !== null) return cached === '1';

    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mutedUntil: true },
    });
    const muted = !!(u?.mutedUntil && u.mutedUntil > new Date());
    const ttl = muted
      ? Math.max(
          1,
          Math.min(
            MUTE_CACHE_MAX_TTL_SECONDS,
            Math.ceil((u!.mutedUntil!.getTime() - Date.now()) / 1000),
          ),
        )
      : MUTE_CACHE_MAX_TTL_SECONDS;
    await this.redis.set(`chat:mutecache:${userId}`, muted ? '1' : '0', ttl);
    return muted;
  }

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
      // 个人房间：用于定向下发（如禁言通知），避免全站广播泄露处罚记录
      client.join(`user:${payload.sub}`);
    } catch {
      client.data.userId = null;
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.leaveAllRooms(client);
  }

  /**
   * Remove the socket from every tracked stream room (bookkeeping Map and
   * the socket.io room alike), queueing the new online count for each
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

    // 匿名即可触发历史查询，必须频控（按 socket 计）
    const joins = await this.redis.incr(
      `join:rate:${client.id}`,
      JOIN_RATE_WINDOW_SECONDS,
    );
    if (joins > JOIN_RATE_LIMIT) return;

    // leave previous stream rooms (socket.io rooms and bookkeeping)
    this.leaveAllRooms(client, streamId);

    if (!this.rooms.has(streamId)) this.rooms.set(streamId, new Set());
    this.rooms.get(streamId)!.add(client.id);
    client.join(`stream:${streamId}`);

    const pool = await this.poolFor(streamId);
    const history = await this.chat.listByStreams(pool);
    client.emit('messageHistory', { streamId, poolStreamIds: pool, messages: history });
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

    // 限流最先执行：被限的消息不允许再触发任何 DB 查询
    const sent = await this.redis.incr(
      `chat:rate:${client.userId}`,
      CHAT_RATE_WINDOW_SECONDS,
    );
    if (sent > CHAT_RATE_LIMIT) {
      client.emit('error', { message: '发送太频繁，请稍后再试' });
      return;
    }

    if (await this.isMuted(client.userId)) {
      client.emit('error', { message: '你已被禁言，暂时无法发言' });
      return;
    }

    const msg = await this.chat.send(streamId, client.userId, body.content);
    // PK 期间扇出到对战双方房间；socket.io 会对同处两房间的连接去重
    const pool = await this.poolFor(streamId);
    this.io
      .to(pool.map((id) => `stream:${id}`))
      .emit('message', { ...msg, poolStreamIds: pool });
  }

  /** 管理员禁言/解禁：mutedUntil 落库，跨连接、跨重启生效；minutes<=0 表示解除 */
  @SubscribeMessage('muteUser')
  async onMute(
    @MessageBody() body: { userId: number; minutes: number },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    if (client.role !== 'ADMIN') {
      client.emit('error', { message: 'Admin only' });
      return;
    }
    const userId = Number(body?.userId);
    if (!userId) return;
    const rawMinutes = Number(body?.minutes);
    const unmute = !Number.isFinite(rawMinutes) || rawMinutes <= 0;
    const minutes = unmute ? 0 : Math.min(Math.ceil(rawMinutes), MUTE_MAX_MINUTES);

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });
    if (!target) {
      client.emit('error', { message: '用户不存在' });
      return;
    }
    if (target.role === 'ADMIN') {
      client.emit('error', { message: '不能禁言管理员' });
      return;
    }

    const until = unmute ? null : new Date(Date.now() + minutes * 60_000);
    await this.prisma.user.update({
      where: { id: userId },
      data: { mutedUntil: until },
    });
    await this.redis.set(
      `chat:mutecache:${userId}`,
      unmute ? '0' : '1',
      unmute
        ? MUTE_CACHE_MAX_TTL_SECONDS
        : Math.min(MUTE_CACHE_MAX_TTL_SECONDS, minutes * 60),
    );
    this.log.log(
      unmute
        ? `admin#${client.userId} unmuted user#${userId}(${target.username})`
        : `admin#${client.userId} muted user#${userId}(${target.username}) for ${minutes}min`,
    );
    client.emit('muteResult', { userId, username: target.username, minutes });
    // 只发给当事人：处罚记录不向全站（含匿名连接）广播
    this.io.to(`user:${userId}`).emit('muted', {
      userId,
      minutes,
      until: until ? until.toISOString() : null,
    });
  }

  /** 点赞：登录用户限流后进入合并缓冲，按秒批量落库并广播最新计数 */
  @SubscribeMessage('like')
  async onLike(
    @MessageBody() body: { streamId: number },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    if (!client.userId) {
      client.emit('error', { message: '登录后才能点赞' });
      return;
    }
    const streamId = Number(body?.streamId);
    if (!streamId || streamId < 0 || !Number.isSafeInteger(streamId)) return;

    const n = await this.redis.incr(
      `like:rate:${client.userId}`,
      LIKE_RATE_WINDOW_SECONDS,
    );
    if (n > LIKE_RATE_LIMIT) return; // 静默丢弃，连点体验不打断

    this.pendingLikes.set(streamId, (this.pendingLikes.get(streamId) ?? 0) + 1);
  }

  announcePkStarted(session: { id: number; streamAId: number; streamBId: number }) {
    this.invalidatePoolCache();
    this.io.emit('pkStarted', session);
  }

  announcePkEnded(sessionId: number) {
    this.invalidatePoolCache();
    this.io.emit('pkEnded', { id: sessionId });
  }

  /** 在线人数变更进入合并缓冲，按秒广播（进出高峰不再逐事件全站扇出） */
  broadcastOnline(streamId: number) {
    this.pendingOnline.add(streamId);
  }

  /** 后台监控用：各直播间聊天在线人数 */
  onlineTotals(): { total: number; byStream: Record<number, number> } {
    const byStream: Record<number, number> = {};
    let total = 0;
    for (const [sid, set] of this.rooms.entries()) {
      byStream[sid] = set.size;
      total += set.size;
    }
    return { total, byStream };
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
