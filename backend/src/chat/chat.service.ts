import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ChatMessageDto {
  id: number;
  streamId: number;
  content: string;
  createdAt: Date;
  user: { id: number; username: string };
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listByStream(streamId: number, take = 50): Promise<ChatMessageDto[]> {
    return this.listByStreams([streamId], take);
  }

  /** PK 对战时聊天池覆盖多个直播间：按时间合并多个房间的历史 */
  async listByStreams(streamIds: number[], take = 50): Promise<ChatMessageDto[]> {
    const msgs = await this.prisma.message.findMany({
      where: { streamId: { in: streamIds } },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, username: true } } },
    });
    return msgs.reverse().map((m) => ({
      id: m.id,
      streamId: m.streamId,
      content: m.content,
      createdAt: m.createdAt,
      user: m.user,
    }));
  }

  async send(
    streamId: number,
    userId: number,
    content: string,
  ): Promise<ChatMessageDto> {
    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 500) {
      throw new ForbiddenException('Invalid message length');
    }
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');

    const msg = await this.prisma.message.create({
      data: { streamId, userId, content: trimmed },
      include: { user: { select: { id: true, username: true } } },
    });
    return {
      id: msg.id,
      streamId: msg.streamId,
      content: msg.content,
      createdAt: msg.createdAt,
      user: msg.user,
    };
  }
}
