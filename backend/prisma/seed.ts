import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-admin-password';
  const inviteCode = process.env.ADMIN_INVITE_CODE || 'ADMIN-INVITE-CODE';

  const existing = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!existing) {
    const hash = await argon2.hash(adminPassword);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        username: adminUsername,
        password: hash,
        role: Role.ADMIN,
        emailVerified: new Date(),
      },
    });
    console.log(`Seeded admin: ${adminEmail}`);
  }

  await prisma.inviteCode.upsert({
    where: { code: inviteCode },
    update: {},
    create: { code: inviteCode },
  });
  console.log(`Seeded invite code: ${inviteCode}`);

  const demoStream = await prisma.stream.findFirst();
  if (!demoStream) {
    const slug = 'main';
    const key = randomBytes(12).toString('hex');
    await prisma.stream.create({
      data: {
        slug,
        title: '主直播间',
        description: '默认主直播间',
        streamKey: key,
      },
    });
    console.log(`Seeded stream: ${slug} (key=${key})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
