import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StreamsService } from './streams.service';
import { CreateStreamDto, UpdateStreamDto } from './dto';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/roles.guard';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streams: StreamsService) {}

  @Public()
  @Get()
  list() {
    return this.streams.listPublic();
  }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.streams.getBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id/admin')
  adminDetail(@Param('id', ParseIntPipe) id: number) {
    return this.streams.adminDetail(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateStreamDto) {
    return this.streams.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStreamDto) {
    return this.streams.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.streams.remove(id);
  }
}
