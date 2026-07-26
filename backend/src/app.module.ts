import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StreamsModule } from './streams/streams.module';
import { ChatModule } from './chat/chat.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AdminModule } from './admin/admin.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { CaptchaModule } from './captcha/captcha.module';
import { SrsModule } from './srs/srs.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { CsrfGuard } from './common/csrf.guard';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    MailModule,
    AuthModule,
    UsersModule,
    StreamsModule,
    ChatModule,
    SubscriptionsModule,
    AdminModule,
    TwoFactorModule,
    CaptchaModule,
    SrsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Global guard order matters: authenticate first (JwtAuthGuard honors
    // @Public()), then authorize (@Roles), then CSRF double-submit check.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
