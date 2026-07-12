import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: RedisClientType;
  private readonly log = new Logger(RedisService.name);
  public readonly pub: RedisClientType;
  public readonly sub: RedisClientType;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.client = createClient({ url }) as RedisClientType;
    this.pub = createClient({ url }) as RedisClientType;
    this.sub = createClient({ url }) as RedisClientType;

    for (const c of [this.client, this.pub, this.sub]) {
      c.on('error', (e) => this.log.error(`Redis error: ${e.message}`));
    }

    Promise.all([this.client.connect(), this.pub.connect(), this.sub.connect()])
      .then(() => this.log.log('Redis connected'))
      .catch((e) => this.log.error(`Redis connect failed: ${e.message}`));
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) await this.client.set(key, value, { EX: ttlSeconds });
    else await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const n = await this.client.incr(key);
    if (n === 1 && ttlSeconds) await this.client.expire(key, ttlSeconds);
    return n;
  }

  async onModuleDestroy() {
    await Promise.all([this.client.quit(), this.pub.quit(), this.sub.quit()]);
  }
}
