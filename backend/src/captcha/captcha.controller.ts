import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CaptchaService } from './captcha.service';

@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captcha: CaptchaService) {}

  @Public()
  @Get()
  async get() {
    return this.captcha.generate();
  }
}
