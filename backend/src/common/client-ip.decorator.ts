import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type ClientInfo = {
  ip: string;
  key: string;
};

export const ClientIp = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ClientInfo => {
    const req = ctx.switchToHttp().getRequest();
    // `trust proxy` is set to 1 in main.ts, so Express derives req.ip from
    // X-Forwarded-For for the single trusted hop (nginx) only — a client
    // cannot spoof it by forging the header.
    const ip: string = req.ip || req.socket?.remoteAddress || '0.0.0.0';
    return { ip, key: `ip:${ip}` };
  },
);
