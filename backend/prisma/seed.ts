import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_INVITE_CODE)) {
    throw new Error(
      'Refusing to seed: ADMIN_PASSWORD and ADMIN_INVITE_CODE must be set in production ' +
        '(defaults are publicly known credentials).',
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-admin-password';
  const inviteCode = process.env.ADMIN_INVITE_CODE || 'ADMIN-INVITE-CODE';

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      '*** WARNING: ADMIN_PASSWORD not set — seeding admin with the well-known ' +
        "dev default 'change-me-admin-password'. NEVER use this outside local dev. ***",
    );
  }
  if (!process.env.ADMIN_INVITE_CODE) {
    console.warn(
      '*** WARNING: ADMIN_INVITE_CODE not set — seeding the well-known dev invite ' +
        "code 'ADMIN-INVITE-CODE'. NEVER use this outside local dev. ***",
    );
  }

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
  console.log(
    isProd ? 'Seeded invite code (value hidden)' : `Seeded invite code: ${inviteCode}`,
  );

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
    // Do not log the stream key: it is the secret RTMP publish credential.
    console.log(`Seeded stream: ${slug} (stream key stored in DB; view it in the admin UI)`);
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
