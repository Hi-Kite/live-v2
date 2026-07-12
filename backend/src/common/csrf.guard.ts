import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.includes(req.method)) return true;

    if (req.url.startsWith('/api/captcha')) return true;
    if (req.url.startsWith('/api/subscriptions/unsubscribe') && req.method === 'GET')
      return true;
    if (req.url.startsWith('/api/auth/verify-email') && req.method === 'GET') return true;
    if (req.url.startsWith('/api/auth/reset-password') && req.method === 'GET') return true;

    const cookieToken = req.cookies?.['csrf-token'];
    const headerToken = req.headers['x-csrf-token'];
    if (!cookieToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token validation failed');
    }
    return true;
  }
}
