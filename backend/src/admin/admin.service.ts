import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StreamsService } from '../streams/streams.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class AdminService {
  private readonly log = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly streams: StreamsService,
    private readonly subs: SubscriptionsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly chat: ChatGateway,
  ) {}

  async startLive(streamId: number) {
    const stream = await this.streams.startLive(streamId);

    // notify via websocket
    this.chat.announceLive({
      id: stream.id,
      slug: stream.slug,
      title: stream.title,
    });

    // send emails (do not block)
    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
    const watchUrl = `${appUrl}/streams/${stream.slug}`;
    const unsubBase = `${appUrl}/unsubscribe`;

    this.subs
      .allRecipients()
      .then((recipients) =>
        this.mail.sendManyLiveNotifications(
          recipients,
          stream.title,
          watchUrl,
          unsubBase,
        ),
      )
      .then(() => this.log.log(`Live notification emails sent for "${stream.title}"`))
      .catch((e) => this.log.error(`Notification emails failed: ${e.message}`));

    return stream;
  }

  async stopLive(streamId: number) {
    const stream = await this.streams.stopLive(streamId);
    this.chat.announceStop(streamId);
    return stream;
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async listStreamsAdmin() {
    const streams = await this.prisma.stream.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return streams.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      streamKey: s.streamKey,
      liveStatus: s.liveStatus,
      startedAt: s.startedAt,
      createdAt: s.createdAt,
      // OBS push config (admin-only): server URL + stream key with auth
      // query param, ready to paste verbatim into OBS.
      ...this.streams.pushInfo(s.slug, s.streamKey),
    }));
  }

  createStream(dto: import('../streams/dto').CreateStreamDto) {
    return this.streams.create(dto);
  }

  async generateInviteCode() {
    const code = randomBytes(8).toString('hex');
    return this.prisma.inviteCode.create({ data: { code } });
  }

  async listInviteCodes() {
    return this.prisma.inviteCode.findMany({
      include: { usedBy: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInviteCode(code: string) {
    const c = await this.prisma.inviteCode.findUnique({ where: { code } });
    if (!c) throw new NotFoundException('Invite code not found');
    if (c.usedById)
      throw new BadRequestException('Cannot revoke a used invite code');
    await this.prisma.inviteCode.delete({ where: { code } });
    return { revoked: true };
  }
}
