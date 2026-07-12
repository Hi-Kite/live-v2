import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

interface AuthedSocket extends Socket {
  userId?: number;
  username?: string;
  role?: string;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  public io!: Server;

  // streamId -> Set<socketId>
  private readonly rooms = new Map<number, Set<string>>();

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
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
    for (const [streamId, set] of this.rooms.entries()) {
      if (set.delete(client.id) && set.size === 0) {
        this.rooms.delete(streamId);
      }
      this.broadcastOnline(streamId);
    }
  }

  @SubscribeMessage('joinStream')
  async onJoin(
    @MessageBody() body: { streamId: number },
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const streamId = Number(body.streamId);
    if (!streamId) return;

    // leave previous stream rooms
    for (const [sid, set] of this.rooms.entries()) {
      if (set.delete(client.id) && set.size === 0) this.rooms.delete(sid);
      this.broadcastOnline(sid);
    }

    if (!this.rooms.has(streamId)) this.rooms.set(streamId, new Set());
    this.rooms.get(streamId)!.add(client.id);
    client.join(`stream:${streamId}`);

    const history = await this.chat.listByStream(streamId);
    client.emit('messageHistory', { streamId, messages: history });
    this.broadcastOnline(streamId);
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
    const streamId = Number(body.streamId);
    const msg = await this.chat.send(streamId, client.userId, body.content);
    this.io.to(`stream:${streamId}`).emit('message', msg);
    this.io.emit('streamMessage', { streamId, message: msg });
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

  async broadcastOnline(streamId: number) {
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
