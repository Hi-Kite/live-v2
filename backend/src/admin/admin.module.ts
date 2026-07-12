import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { StreamsModule } from '../streams/streams.module';
import { ChatModule } from '../chat/chat.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [StreamsModule, ChatModule, SubscriptionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
