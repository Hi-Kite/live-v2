import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string): Promise<void> {
    const lower = email.toLowerCase();
    const exists = await this.prisma.subscription.findUnique({
      where: { email: lower },
    });
    if (exists) throw new ConflictException('Email already subscribed');

    const token = randomBytes(16).toString('hex');
    await this.prisma.subscription.create({
      data: { email: lower, token },
    });
  }

  async unsubscribe(email: string, token: string): Promise<void> {
    const lower = email.toLowerCase();
    const sub = await this.prisma.subscription.findUnique({
      where: { email: lower },
    });
    if (!sub || sub.token !== token) {
      throw new BadRequestException('Invalid unsubscribe link');
    }
    await this.prisma.subscription.delete({ where: { email: lower } });
  }

  async allRecipients() {
    return this.prisma.subscription.findMany({
      select: { email: true, token: true },
    });
  }
}
