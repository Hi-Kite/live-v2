import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
} from './dto';
import { Public } from './public.decorator';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { CurrentUser } from '../common/current-user.decorator';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    res.cookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTS,
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit('register')
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit('login')
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateUser(dto);
    const tokens = await this.auth.login({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
    this.setAuthCookies(res, tokens);
    return {
      // 与 GET /auth/me 的 UserPublic 形状保持一致（前端直接存入 store）
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      },
    };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.refresh(
      req.cookies?.['refresh_token'],
    );
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser('id') userId: number) {
    return this.auth.findUserPublic(userId);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @Get('csrf-token')
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    let token = req.cookies?.['csrf-token'];
    if (!token) {
      token = randomBytes(32).toString('hex');
      res.cookie('csrf-token', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return { token };
  }
}
