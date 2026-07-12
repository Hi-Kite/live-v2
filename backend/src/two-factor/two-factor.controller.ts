import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';

class VerifyDto {
  @IsString()
  code!: string;
}

@Controller('2fa')
@UseGuards(JwtAuthGuard)
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

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('disable')
  disable(@CurrentUser('id') userId: number, @Body() dto: VerifyDto) {
    return this.svc.disable(userId, dto.code);
  }
}
