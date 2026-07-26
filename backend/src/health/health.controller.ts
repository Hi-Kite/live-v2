import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const PROBE_TIMEOUT_MS = 2000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('health probe timeout')), PROBE_TIMEOUT_MS),
    ),
  ]);
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 存活+就绪探针：真实探测 MySQL 与 Redis。任一依赖不可用时返回 503，
   * docker healthcheck / 负载均衡据此摘除实例，而不是静态应答假装健康。
   */
  @Public()
  @Get()
  async ok() {
    const [db, redis] = await Promise.all([
      withTimeout(this.prisma.$queryRaw`SELECT 1`)
        .then(() => true)
        .catch(() => false),
      withTimeout(this.redis.get('health:probe'))
        .then(() => true)
        .catch(() => false),
    ]);
    if (!db || !redis) {
      throw new ServiceUnavailableException({ ok: false, db, redis, ts: Date.now() });
    }
    return { ok: true, db, redis, ts: Date.now() };
  }
}
