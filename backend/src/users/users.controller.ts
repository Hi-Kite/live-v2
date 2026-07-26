import { Controller, Delete, Get } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { UsersService } from './users.service';

// Authentication is enforced by the global JwtAuthGuard (app.module.ts).
@Controller('users')
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
