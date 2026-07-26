import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string): Promise<void> {
    const lower = email.toLowerCase();
    const token = randomBytes(16).toString('hex');
    // Idempotent upsert: an already-subscribed address keeps its existing
    // token and the caller gets the same generic success — no subscriber
    // enumeration via 409, and no check-then-create race.
    await this.prisma.subscription.upsert({
      where: { email: lower },
      update: {},
      create: { email: lower, token },
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
