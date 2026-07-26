import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma, TokenPurpose } from '@prisma/client';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import type { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    // Fail fast at startup: a missing refresh secret in production would
    // otherwise silently mint unverifiable (or forgeable) tokens.
    this.refreshSecret();
  }

  private refreshSecret(): string {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_REFRESH_SECRET must be set in production');
      }
      this.log.warn('JWT_REFRESH_SECRET not set — using insecure dev fallback');
      return 'dev-refresh-secret';
    }
    return secret;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const username = dto.username.toLowerCase();

    const invite = await this.prisma.inviteCode.findUnique({
      where: { code: dto.inviteCode },
    });
    if (!invite || invite.usedById) {
      throw new ForbiddenException('Invalid or already used invite code');
    }

    const existsEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existsEmail) throw new ConflictException('Email already registered');

    const existsUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existsUser) throw new ConflictException('Username already taken');

    const hash = await argon2.hash(dto.password);
    const verifyToken = randomBytes(32).toString('hex');

    let user: { id: number; email: string; username: string };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email, username, password: hash },
          select: { id: true, email: true, username: true },
        });

        // Consume the invite atomically: the usedById filter makes concurrent
        // registrations with the same code lose the race and roll back.
        const consumed = await tx.inviteCode.updateMany({
          where: { code: dto.inviteCode, usedById: null },
          data: { usedById: created.id, usedAt: new Date() },
        });
        if (consumed.count !== 1) {
          throw new ForbiddenException('Invalid or already used invite code');
        }

        await tx.passwordReset.create({
          data: {
            userId: created.id,
            token: verifyToken,
            purpose: TokenPurpose.VERIFY,
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          },
        });

        return created;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email or username already taken');
      }
      throw e;
    }

    const verifyUrl = `${this.config.get<string>('APP_URL')}/verify-email?token=${verifyToken}`;
    this.mail
      .sendVerifyEmail(user.email, verifyUrl)
      .catch((e) => this.log.error(`verify email failed: ${e.message}`));

    return { id: user.id, email: user.email, username: user.username };
  }

  async validateUser(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await argon2.verify(user.password, dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    if (user.twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        throw new UnauthorizedException({
          message: '需要两步验证码',
          code: 'TWO_FACTOR_REQUIRED',
        });
      }
      const valid =
        !!user.twoFactorSecret &&
        authenticator.verify({
          token: dto.twoFactorCode,
          secret: user.twoFactorSecret,
        });
      if (!valid) {
        throw new UnauthorizedException('两步验证码错误');
      }
    }

    return user;
  }

  async login(user: { id: number; email: string; username: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret(),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') || '7d',
    });
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.login({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.passwordReset.findUnique({
      where: { token },
    });
    if (
      !record ||
      record.used ||
      record.purpose !== TokenPurpose.VERIFY ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.emailVerified) throw new BadRequestException('Already verified');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
    await this.prisma.passwordReset.update({
      where: { token },
      data: { used: true },
    });
    return { verified: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) return { sent: true };

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        purpose: TokenPurpose.RESET,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    const resetUrl = `${this.config.get<string>('APP_URL')}/reset-password?token=${token}`;
    this.mail
      .sendPasswordReset(user.email, resetUrl)
      .catch((e) => this.log.error(`reset email failed: ${e.message}`));

    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
    });
    if (
      !record ||
      record.used ||
      record.purpose !== TokenPurpose.RESET ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { password: hash },
    });
    await this.prisma.passwordReset.update({
      where: { token: dto.token },
      data: { used: true },
    });
    return { reset: true };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const ok = await argon2.verify(user.password, currentPassword);
    if (!ok) throw new UnauthorizedException('Current password incorrect');

    const hash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
    return { changed: true };
  }

  async findUserPublic(userId: number) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }
}
