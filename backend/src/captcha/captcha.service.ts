import { Injectable } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';
import { RedisService } from '../redis/redis.service';
import { randomBytes } from 'crypto';

@Injectable()
export class CaptchaService {
  constructor(
    private readonly redis: RedisService,
  ) {}

  async generate(): Promise<{ id: string; svg: string }> {
    const c = svgCaptcha.createMathExpr({
      size: 4,
      noise: 3,
      color: true,
      background: '#f0f4f8',
    });
    const id = randomBytes(16).toString('hex');
    await this.redis.set(`captcha:${id}`, c.text.toLowerCase(), 5 * 60);
    return { id, svg: c.data };
  }

  async verify(id: string, value: string): Promise<boolean> {
    if (!id || !value) return false;
    const stored = await this.redis.get(`captcha:${id}`);
    if (!stored) return false;
    await this.redis.del(`captcha:${id}`);
    return stored === value.toLowerCase();
  }
}
