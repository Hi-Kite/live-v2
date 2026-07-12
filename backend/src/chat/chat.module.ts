import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev-secret',
    }),
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
