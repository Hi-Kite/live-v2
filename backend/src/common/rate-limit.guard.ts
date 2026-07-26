import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';

export const RATE_LIMIT_KEY = 'rate_limit_action';

/**
 * Names the rate-limit bucket for a handler, e.g. @RateLimit('login').
 * Limits stay environment-driven via RATE_LIMIT_<ACTION>_TTL/_LIMIT
 * (see limitsFor below). Without the decorator the handler name is used.
 */
export const RateLimit = (action: string) => SetMetadata(RATE_LIMIT_KEY, action);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    // req.ip is trustworthy only when Express `trust proxy` is enabled in
    // main.ts; never read X-Forwarded-For directly (trivially spoofable).
    const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';

    const action =
      this.reflector.getAllAndOverride<string>(RATE_LIMIT_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) || ctx.getHandler().name;
    const { ttl, limit } = this.limitsFor(action);

    const key = `rl:${action}:${ip}`;
    const n = await this.redis.incr(key, ttl);

    if (n > limit) {
      throw new HttpException(
        `Too many requests, retry in ${ttl}s`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private limitsFor(action: string): { ttl: number; limit: number } {
    const c = this.config;
    switch (action) {
      case 'login':
        return {
          ttl: Number(c.get('RATE_LIMIT_LOGIN_TTL')) || 60,
          limit: Number(c.get('RATE_LIMIT_LOGIN_LIMIT')) || 5,
        };
      case 'register':
        return {
          ttl: Number(c.get('RATE_LIMIT_REGISTER_TTL')) || 60,
          limit: Number(c.get('RATE_LIMIT_REGISTER_LIMIT')) || 3,
        };
      case 'subscribe':
        return {
          ttl: Number(c.get('RATE_LIMIT_SUBSCRIBE_TTL')) || 60,
          limit: Number(c.get('RATE_LIMIT_SUBSCRIBE_LIMIT')) || 5,
        };
      default:
        return { ttl: 60, limit: 30 };
    }
  }
}
