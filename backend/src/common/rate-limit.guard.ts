import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      '0.0.0.0';

    const handler = ctx.getHandler().name;
    const { ttl, limit } = this.limitsFor(handler);

    const key = `rl:${handler}:${ip}`;
    const n = await this.redis.incr(key, ttl);

    if (n > limit) {
      throw new HttpException(
        `Too many requests, retry in ${ttl}s`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private limitsFor(handler: string): { ttl: number; limit: number } {
    const c = this.config;
    switch (handler) {
      case 'login':
        return {
          ttl: Number(c.get('RATE_LIMIT_LOGIN_TTL')) || 60,
          limit: Number(c.get('RATE_LIMIT_LOGIN_LIMIT')) || 5,
        };
      case 'register':
        return {
          ttl: Number(c.get('RATE_LIMIT_REGISTER_TTL')) || 3600,
          limit: Number(c.get('RATE_LIMIT_REGISTER_LIMIT')) || 10,
        };
      default:
        return { ttl: 60, limit: 30 };
    }
  }
}
