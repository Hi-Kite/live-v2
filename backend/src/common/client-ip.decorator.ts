import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type ClientInfo = {
  ip: string;
  key: string;
};

export const ClientIp = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ClientInfo => {
    const req = ctx.switchToHttp().getRequest();
    const raw =
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      '0.0.0.0';
    const ip = String(raw).split(',')[0].trim();
    return { ip, key: `ip:${ip}` };
  },
);
