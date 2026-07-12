import { Global, Module } from '@nestjs/common';
import { SrsService } from './srs.service';

@Global()
@Module({
  providers: [SrsService],
  exports: [SrsService],
})
export class SrsModule {}
