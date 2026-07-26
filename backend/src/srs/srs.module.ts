import { Global, Module } from '@nestjs/common';
import { SrsService } from './srs.service';
import { SrsHooksController } from './srs-hooks.controller';

@Global()
@Module({
  controllers: [SrsHooksController],
  providers: [SrsService],
  exports: [SrsService],
})
export class SrsModule {}
