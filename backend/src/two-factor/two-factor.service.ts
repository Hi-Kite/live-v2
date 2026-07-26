import { Injectable, BadRequestException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async generate(userId: number) {
    const appName = this.config.get<string>('APP_NAME') || 'LIVE';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.twoFactorEnabled) {
      // Never silently overwrite an active 2FA secret: a hijacked session
      // must not be able to neutralize 2FA without the current TOTP code.
      throw new BadRequestException(
        '2FA is already enabled; disable it with a valid code first',
      );
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, appName, secret);
    const qr = await toDataURL(otpauth);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    return { secret, qr, otpauth };
  }

  async verify(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up');
    }
    const ok = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!ok) throw new BadRequestException('Invalid code');
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { enabled: true };
  }

  async disable(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up');
    }
    const ok = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!ok) throw new BadRequestException('Invalid code');
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });
    return { enabled: false };
  }

  async verifyCode(userId: number, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) return false;
    return authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
  }
}
