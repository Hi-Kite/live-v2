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

export interface PlaybackUrls {
  rtmpPush: string;
  httpFlv: string;
  hls: string;
  webrtc: string;
}

@Injectable()
export class SrsService {
  private readonly log = new Logger(SrsService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiBase(): string {
    return `http://${this.config.get<string>('SRS_API_HOST', 'localhost')}:${this.config.get<string>('SRS_API_PORT', '1985')}`;
  }

  async listStreams(): Promise<SrsStreamInfo[]> {
    try {
      const res = await fetch(`${this.apiBase}/api/v1/streams/`);
      if (!res.ok) return [];
      const data = (await res.json()) as { streams?: SrsStreamInfo[] };
      return data.streams ?? [];
    } catch (e) {
      this.log.warn(`listStreams failed: ${(e as Error).message}`);
      return [];
    }
  }

  async getStreamByName(name: string): Promise<SrsStreamInfo | null> {
    try {
      const res = await fetch(`${this.apiBase}/api/v1/streams/${encodeURIComponent(name)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { stream?: SrsStreamInfo };
      return data.stream ?? null;
    } catch {
      return null;
    }
  }

  async isLive(streamKey: string): Promise<boolean> {
    const s = await this.getStreamByName(streamKey);
    return !!s && s.publish?.active === true;
  }

  playbackUrls(streamKey: string): PlaybackUrls {
    const rtmpHost = this.config.get<string>('SRS_RTMP_HOST', 'localhost');
    const rtmpPort = this.config.get<string>('SRS_RTMP_PORT', '1935');
    const httpHost = this.config.get<string>('SRS_HTTP_HOST', 'localhost');
    const httpPort = this.config.get<string>('SRS_HTTP_PORT', '8080');
    const apiHost = this.config.get<string>('SRS_API_HOST', 'localhost');

    return {
      rtmpPush: `rtmp://${rtmpHost}:${rtmpPort}/live/${streamKey}`,
      httpFlv: `http://${httpHost}:${httpPort}/live/${streamKey}.flv`,
      hls: `http://${httpHost}:${httpPort}/live/${streamKey}.m3u8`,
      webrtc: `http://${apiHost}:${httpPort}/live/${streamKey}.webrtc`,
    };
  }
}
