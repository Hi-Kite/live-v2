import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdPublic(id: number) {
    const u = await this.prisma.user.findUnique({
      where: { id },
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

  async deleteAccount(id: number) {
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }
}
