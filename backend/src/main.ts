import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false,
  });
  const config = app.get(ConfigService);

  // The stack sits behind nginx: trust exactly one proxy hop so req.ip
  // reflects the real client address (used by rate limiting / IP logging)
  // instead of the nginx container IP, without honoring client-forged
  // X-Forwarded-For chains.
  app.set('trust proxy', 1);

  const origins = (config.get<string>('BACKEND_CORS_ORIGINS') || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim());

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || origins.includes(origin)) cb(null, true);
      else cb(new Error(`Origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');
  app.useWebSocketAdapter(new IoAdapter(app));
  // SIGTERM/SIGINT 时触发 onModuleDestroy（Redis 断连、点赞缓冲落库等），
  // 容器滚动更新不丢内存中的待写数据
  app.enableShutdownHooks();

  const port = Number(config.get<string>('PORT') || '3001');
  await app.listen(port, '0.0.0.0');
  Logger.log(`Backend listening on :${port}`, 'Bootstrap');
}

bootstrap();
