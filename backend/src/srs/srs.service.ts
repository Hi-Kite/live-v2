import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SrsStreamInfo {
  name: string;
  vhost: string;
  app: string;
  tcUrl: string;
  url: string;
  live: boolean;
  clients: number;
  frames: number;
  send_bytes: number;
  recv_bytes: number;
  kbps: { recv_30s: number; send_30s: number };
  publish: { active: boolean; cid: string };
  video: { codec: string; profile: string; level: string; width: number; height: number };
  audio: { codec: string; sample_rate: number; channel: number; profile: string };
}

export interface SrsSummary {
  ok: boolean;
  /** SRS 进程 CPU 占用（百分比 0-100） */
  cpuPercent: number | null;
  /** SRS 进程内存占用（MB） */
  memMB: number | null;
  /** 系统 CPU 占用（百分比 0-100） */
  sysCpuPercent: number | null;
  /** SRS 当前连接数 */
  connections: number | null;
}

export interface PlaybackUrls {
  httpFlv: string;
  hls: string;
  /**
   * SRS5 WebRTC playback needs dedicated /rtc signaling which is not wired
   * up; kept as an empty string so existing frontend types keep compiling.
   */
  webrtc: string;
}

/** How long the SRS streams list is served from memory. */
const STREAMS_CACHE_TTL_MS = 4000;
/** Timeout for outbound calls to the SRS HTTP API. */
const SRS_FETCH_TIMEOUT_MS = 3000;

@Injectable()
export class SrsService {
  private readonly log = new Logger(SrsService.name);

  /**
   * Tiny in-memory cache of the SRS streams list. Storing the in-flight
   * promise also deduplicates concurrent lookups (e.g. listPublic fanning
   * out one isLive check per stream).
   */
  private streamsCache: { expiresAt: number; promise: Promise<SrsStreamInfo[]> } | null = null;

  constructor(private readonly config: ConfigService) {}

  private get apiBase(): string {
    return `http://${this.config.get<string>('SRS_API_HOST', 'localhost')}:${this.config.get<string>('SRS_API_PORT', '1985')}`;
  }

  async listStreams(): Promise<SrsStreamInfo[]> {
    const now = Date.now();
    if (this.streamsCache && this.streamsCache.expiresAt > now) {
      return this.streamsCache.promise;
    }
    const promise = this.fetchStreams();
    this.streamsCache = { expiresAt: now + STREAMS_CACHE_TTL_MS, promise };
    return promise;
  }

  /** Drop the cached streams list (called by the SRS publish/unpublish hooks). */
  invalidateStreamsCache(): void {
    this.streamsCache = null;
  }

  private async fetchStreams(): Promise<SrsStreamInfo[]> {
    try {
      const res = await fetch(`${this.apiBase}/api/v1/streams/`, {
        signal: AbortSignal.timeout(SRS_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { streams?: SrsStreamInfo[] };
      return data.streams ?? [];
    } catch (e) {
      this.log.warn(`listStreams failed: ${(e as Error).message}`);
      return [];
    }
  }

  /** SRS 进程/系统概要（CPU、内存、连接数）；SRS 不可达时 ok=false */
  async summary(): Promise<SrsSummary> {
    const empty: SrsSummary = {
      ok: false,
      cpuPercent: null,
      memMB: null,
      sysCpuPercent: null,
      connections: null,
    };
    try {
      const res = await fetch(`${this.apiBase}/api/v1/summaries`, {
        signal: AbortSignal.timeout(SRS_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return empty;
      const body = (await res.json()) as {
        data?: {
          self?: { cpu_percent?: number; mem_kbyte?: number };
          system?: { cpu_percent?: number; conn_srs?: number };
        };
      };
      const self = body.data?.self;
      const sys = body.data?.system;
      // SRS 的 cpu_percent 是 0~1 的比例
      return {
        ok: true,
        cpuPercent: typeof self?.cpu_percent === 'number' ? Math.round(self.cpu_percent * 1000) / 10 : null,
        memMB: typeof self?.mem_kbyte === 'number' ? Math.round(self.mem_kbyte / 1024) : null,
        sysCpuPercent: typeof sys?.cpu_percent === 'number' ? Math.round(sys.cpu_percent * 1000) / 10 : null,
        connections: typeof sys?.conn_srs === 'number' ? sys.conn_srs : null,
      };
    } catch {
      return empty;
    }
  }

  /**
   * Whether a stream is actually being published to SRS. Publish names are
   * slug-based (OBS pushes live/<slug>?key=<streamKey>), so this matches on
   * the slug, never the stream key.
   */
  async isLive(slug: string): Promise<boolean> {
    const streams = await this.listStreams();
    return streams.some(
      (s) => s.app === 'live' && s.name === slug && s.publish?.active === true,
    );
  }

  /**
   * Public playback URLs, slug-based — the stream key never appears here.
   * Built from PUBLIC_STREAM_BASE (e.g. https://live.example.com/streams,
   * proxied by nginx to SRS); falls back to the path-only /streams prefix so
   * browsers inherit scheme/host from the page origin.
   */
  playbackUrls(slug: string): PlaybackUrls {
    const base = (this.config.get<string>('PUBLIC_STREAM_BASE') || '/streams').replace(
      /\/+$/,
      '',
    );
    const name = encodeURIComponent(slug);
    return {
      httpFlv: `${base}/live/${name}.flv`,
      hls: `${base}/live/${name}.m3u8`,
      webrtc: '',
    };
  }

  /**
   * RTMP base URL shown to admins for OBS ("server" field):
   * rtmp://<public host>:1935/live/
   */
  publishBase(): string {
    const host =
      this.config.get<string>('PUBLIC_RTMP_HOST') || this.appUrlHost() || 'localhost';
    const port = this.config.get<string>('PUBLIC_RTMP_PORT', '1935');
    return `rtmp://${host}:${port}/live/`;
  }

  /**
   * OBS "stream key" field: <slug>?key=<streamKey>. The key is validated
   * server-side by the SRS on-publish hook.
   */
  publishKey(slug: string, streamKey: string): string {
    return `${slug}?key=${streamKey}`;
  }

  private appUrlHost(): string | null {
    const appUrl = this.config.get<string>('APP_URL');
    if (!appUrl) return null;
    try {
      return new URL(appUrl).hostname;
    } catch {
      return null;
    }
  }
}
