import { Module } from '@nestjs/common';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';

@Module({
  controllers: [TwoFactorController],
  providers: [TwoFactorService],
  // Exported so the auth module can verify TOTP codes during login
  // (TwoFactorService.verifyCode).
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
