import { Body, Controller, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { TwoFactorService } from './two-factor.service';
import { Roles } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';

class VerifyDto {
  @IsString()
  code!: string;
}

/**
 * 2FA is an admin-only feature per PLAN.md (管理员两步验证): the admin
 * account protects stream/user management with TOTP. All three endpoints
 * therefore require the ADMIN role and operate on the current user.
 * Authentication + role checks come from the global JwtAuthGuard/RolesGuard
 * (app.module.ts); disabling additionally requires a valid current TOTP
 * code (enforced in TwoFactorService.disable) so a hijacked/CSRF'd session
 * cannot silently switch 2FA off.
 */
@Controller('2fa')
@Roles('ADMIN')
export class TwoFactorController {
  constructor(private readonly svc: TwoFactorService) {}

  @Post('setup')
  setup(@CurrentUser('id') userId: number) {
    return this.svc.generate(userId);
  }

  @Post('verify')
  verify(@CurrentUser('id') userId: number, @Body() dto: VerifyDto) {
    return this.svc.verify(userId, dto.code);
  }

  @Post('disable')
  disable(@CurrentUser('id') userId: number, @Body() dto: VerifyDto) {
    return this.svc.disable(userId, dto.code);
  }
}
