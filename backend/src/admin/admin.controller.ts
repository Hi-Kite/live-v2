import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateStreamDto } from '../streams/dto';

// Authentication/authorization is enforced by the global JwtAuthGuard and
// RolesGuard (app.module.ts); @Roles supplies the required-role metadata.
@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard(@CurrentUser('id') _userId: number) {
    return { ok: true, role: 'ADMIN' };
  }

  // ---- streams
  @Get('streams')
  listStreams() {
    return this.admin.listStreamsAdmin();
  }

  @Post('streams')
  createStream(@Body() dto: CreateStreamDto) {
    return this.admin.createStream(dto);
  }

  @Post('streams/:id/start')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.admin.startLive(id);
  }

  @Post('streams/:id/stop')
  stop(@Param('id', ParseIntPipe) id: number) {
    return this.admin.stopLive(id);
  }

  // ---- users
  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteUser(id);
  }

  // ---- invite codes
  @Post('invite-codes')
  generate() {
    return this.admin.generateInviteCode();
  }

  @Get('invite-codes')
  listInviteCodes() {
    return this.admin.listInviteCodes();
  }

  @Delete('invite-codes/:code')
  revoke(@Param('code') code: string) {
    return this.admin.revokeInviteCode(code);
  }
}
