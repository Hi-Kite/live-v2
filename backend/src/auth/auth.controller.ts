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
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
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
    res.cookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('id') userId: number, @Res() _res: Response) {
    const u = await this.auth.findUserPublic(userId);
    return u;
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

  @UseGuards(JwtAuthGuard)
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
      token = Math.random().toString(36).slice(2) + Date.now().toString(36);
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
