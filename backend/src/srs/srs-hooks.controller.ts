import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SrsService } from './srs.service';

/**
 * SRS5 http_hooks callback body (subset). Typed as an interface (not a
 * validated DTO) on purpose: SRS sends extra fields and the global
 * ValidationPipe runs with forbidNonWhitelisted.
 */
interface SrsHookBody {
  action?: string;
  client_id?: string;
  ip?: string;
  vhost?: string;
  app?: string;
  stream?: string;
  param?: string;
}

/** SRS treats code 0 as allow; any non-zero code (HTTP 200) rejects. */
const ALLOW = { code: 0 };
const REJECT = { code: 1 };

/**
 * Publish auth for SRS: OBS pushes rtmp://host:1935/live/<slug>?key=<streamKey>.
 * SRS calls on-publish with app='live', stream='<slug>', param='?key=...';
 * we validate the key against the stream's secret streamKey. Playback names
 * are slug-based, so the key never leaks through playback URLs.
 *
 * Note: liveStatus stays admin-controlled (editorial state); the real-live
 * signal (actualLive) is derived from the SRS API, so the hooks only bust
 * the SRS streams cache to make that signal update promptly.
 */
@Controller('srs/hooks')
export class SrsHooksController {
  private readonly log = new Logger(SrsHooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly srs: SrsService,
  ) {}

  @Public()
  @Post('on-publish')
  @HttpCode(200)
  async onPublish(@Body() body: SrsHookBody) {
    const app = body?.app ?? '';
    const slug = body?.stream ?? '';
    const from = body?.ip ?? 'unknown';

    if (app !== 'live' || !slug) {
      this.log.warn(`Rejected publish (bad app/stream) app="${app}" stream="${slug}" from ${from}`);
      return REJECT;
    }

    const key = this.extractKey(body?.param ?? '');
    if (!key) {
      this.log.warn(`Rejected publish (missing key) for "${slug}" from ${from}`);
      return REJECT;
    }

    const stream = await this.prisma.stream.findUnique({ where: { slug } });
    if (!stream || !this.safeEqual(key, stream.streamKey)) {
      this.log.warn(`Rejected publish (invalid key) for "${slug}" from ${from}`);
      return REJECT;
    }

    this.srs.invalidateStreamsCache();
    this.log.log(`Publish accepted for "${slug}" from ${from}`);
    return ALLOW;
  }

  @Public()
  @Post('on-unpublish')
  @HttpCode(200)
  async onUnpublish(@Body() body: SrsHookBody) {
    const slug = body?.stream ?? '';
    const from = body?.ip ?? 'unknown';

    // SRS forwards the publish query params here too — require the same key
    // so外部无法伪造回调刷缓存。
    const key = this.extractKey(body?.param ?? '');
    const stream = slug
      ? await this.prisma.stream.findUnique({ where: { slug } })
      : null;
    if (!stream || !key || !this.safeEqual(key, stream.streamKey)) {
      this.log.warn(`Ignored unpublish (invalid key) for "${slug}" from ${from}`);
      return REJECT;
    }

    this.srs.invalidateStreamsCache();
    this.log.log(`Unpublish for "${slug}" from ${from}`);
    return ALLOW;
  }

  /** param arrives as '?key=xxx' (possibly with other query params). */
  private extractKey(param: string): string {
    const qs = param.startsWith('?') ? param.slice(1) : param;
    try {
      return new URLSearchParams(qs).get('key') ?? '';
    } catch {
      return '';
    }
  }

  /** Constant-time comparison; hashing first hides length differences. */
  private safeEqual(a: string, b: string): boolean {
    const ha = createHash('sha256').update(a).digest();
    const hb = createHash('sha256').update(b).digest();
    return timingSafeEqual(ha, hb);
  }
}
