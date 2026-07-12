import {
  Controller,
  Delete,
  Get,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser('id') id: number) {
    return this.users.findByIdPublic(id);
  }

  @Delete('me')
  delete(@CurrentUser('id') id: number) {
    return this.users.deleteAccount(id);
  }
}
