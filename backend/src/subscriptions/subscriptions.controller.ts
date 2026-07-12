import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { Public } from '../auth/public.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { CaptchaService } from '../captcha/captcha.service';

class SubscribeDto {
  @IsEmail()
  email!: string;
  captchaId!: string;
  captchaCode!: string;
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly captcha: CaptchaService,
  ) {}

  @Public()
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto) {
    const ok = await this.captcha.verify(dto.captchaId, dto.captchaCode);
    if (!ok) throw new BadRequestException('Captcha incorrect');
    await this.subs.subscribe(dto.email);
    return { subscribed: true };
  }

  @Public()
  @Get('unsubscribe')
  async unsubscribe(
    @Query('email') email: string,
    @Query('token') token: string,
  ) {
    await this.subs.unsubscribe(email, token);
    return { unsubscribed: true };
  }
}
