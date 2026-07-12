import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException('Not authenticated');
    return data ? req.user[data] : req.user;
  },
);
