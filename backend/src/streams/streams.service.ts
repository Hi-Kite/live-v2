import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SrsService } from '../srs/srs.service';
import { CreateStreamDto, UpdateStreamDto } from './dto';
import { randomBytes } from 'crypto';
import { slugify } from './slugify';

@Injectable()
export class StreamsService {
  private readonly log = new Logger(StreamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly srs: SrsService,
  ) {}

  /**
   * OBS push config per contract: pushBase is the RTMP server URL, pushKey
   * is '<slug>?key=<streamKey>'. Also used by AdminService for its stream
   * listings — the streamKey itself must never leak into public payloads.
   */
  pushInfo(slug: string, streamKey: string): { pushBase: string; pushKey: string } {
    return {
      pushBase: this.srs.publishBase(),
      pushKey: this.srs.publishKey(slug, streamKey),
    };
  }

  async listPublic() {
    const streams = await this.prisma.stream.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(
      streams.map(async (s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        liveStatus: s.liveStatus,
        startedAt: s.startedAt,
        actualLive: await this.srs.isLive(s.slug),
      })),
    );
  }

  async getBySlug(slug: string) {
    const s = await this.prisma.stream.findUnique({ where: { slug } });
    if (!s) throw new NotFoundException('Stream not found');
    const playback = this.srs.playbackUrls(s.slug);
    const actualLive = await this.srs.isLive(s.slug);
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      liveStatus: s.liveStatus,
      actualLive,
      startedAt: s.startedAt,
      playback: { hls: playback.hls, flv: playback.httpFlv, webrtc: playback.webrtc },
    };
  }

  async getById(id: number) {
    const s = await this.prisma.stream.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Stream not found');
    return s;
  }

  async create(dto: CreateStreamDto) {
    const slug = dto.slug || slugify(dto.title);
    const existing = await this.prisma.stream.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Slug already in use');

    const streamKey = randomBytes(12).toString('hex');
    const s = await this.prisma.stream.create({
      data: {
        slug,
        title: dto.title,
        description: dto.description ?? null,
        streamKey,
      },
    });
    this.log.log(`Stream created: ${slug}`);
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      streamKey: s.streamKey,
      ...this.pushInfo(s.slug, s.streamKey),
      playback: this.srs.playbackUrls(s.slug),
    };
  }

  async update(id: number, dto: UpdateStreamDto) {
    const s = await this.prisma.stream.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Stream not found');

    if (dto.slug && dto.slug !== s.slug) {
      const taken = await this.prisma.stream.findUnique({
        where: { slug: dto.slug },
      });
      if (taken) throw new ConflictException('Slug already in use');
    }

    return this.prisma.stream.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        slug: dto.slug,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        streamKey: true,
        liveStatus: true,
      },
    });
  }

  async remove(id: number) {
    const s = await this.prisma.stream.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Stream not found');
    if (s.liveStatus)
      throw new BadRequestException('Cannot delete a live stream; stop it first');
    await this.prisma.stream.delete({ where: { id } });
    return { deleted: true };
  }

  async startLive(id: number) {
    const s = await this.prisma.stream.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Stream not found');
    if (s.liveStatus) throw new BadRequestException('Already live');

    const updated = await this.prisma.stream.update({
      where: { id },
      data: { liveStatus: true, startedAt: new Date() },
    });

    return {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      streamKey: updated.streamKey,
      ...this.pushInfo(updated.slug, updated.streamKey),
      liveStatus: updated.liveStatus,
      startedAt: updated.startedAt,
    };
  }

  async stopLive(id: number) {
    const s = await this.prisma.stream.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Stream not found');
    if (!s.liveStatus) throw new BadRequestException('Not currently live');

    const updated = await this.prisma.stream.update({
      where: { id },
      data: { liveStatus: false, startedAt: null },
    });
    return {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      liveStatus: updated.liveStatus,
    };
  }

  async adminDetail(id: number) {
    const s = await this.getById(id);
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      streamKey: s.streamKey,
      ...this.pushInfo(s.slug, s.streamKey),
      liveStatus: s.liveStatus,
      startedAt: s.startedAt,
      createdAt: s.createdAt,
      playback: this.srs.playbackUrls(s.slug),
    };
  }
}
