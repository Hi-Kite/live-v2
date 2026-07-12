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
import * as argon2 from 'argon2';
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
  ) {}

  async register(dto: RegisterDto) {
    const invite = await this.prisma.inviteCode.findUnique({
      where: { code: dto.inviteCode },
    });
    if (!invite || invite.usedById) {
      throw new ForbiddenException('Invalid or already used invite code');
    }

    const existsEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existsEmail) throw new ConflictException('Email already registered');

    const existsUser = await this.prisma.user.findUnique({
      where: { username: dto.username.toLowerCase() },
    });
    if (existsUser) throw new ConflictException('Username already taken');

    const hash = await argon2.hash(dto.password);
    const verifyToken = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        password: hash,
      },
    });

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: verifyToken,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });

    await this.prisma.inviteCode.update({
      where: { code: dto.inviteCode },
      data: { usedById: user.id, usedAt: new Date() },
    });

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
        throw new BadRequestException('2FA code required');
      }
      // verify handled in TwoFactorService via controller check; here we only gate.
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
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') || '7d',
    });
    return { accessToken, refreshToken };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.passwordReset.findUnique({
      where: { token },
    });
    if (!record || record.used) throw new BadRequestException('Invalid token');

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
    if (!record || record.used || record.expiresAt < new Date()) {
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
