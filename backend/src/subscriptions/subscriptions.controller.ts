import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { IsEmail, IsString, Length } from 'class-validator';
import { Public } from '../auth/public.decorator';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CaptchaService } from '../captcha/captcha.service';

class SubscribeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 64)
  captchaId!: string;

  @IsString()
  @Length(1, 32)
  captchaCode!: string;
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly captcha: CaptchaService,
  ) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit('subscribe')
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto) {
    const ok = await this.captcha.verify(dto.captchaId, dto.captchaCode);
    if (!ok) throw new BadRequestException('Captcha incorrect');
    await this.subs.subscribe(dto.email);
    // Generic response whether or not the email was already subscribed,
    // so the endpoint cannot be used to enumerate subscriber addresses.
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
