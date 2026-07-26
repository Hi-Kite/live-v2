import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { StreamsService } from './streams.service';
import { CreateStreamDto, UpdateStreamDto, StartPkDto } from './dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../common/roles.guard';
import { ChatGateway } from '../chat/chat.gateway';

@Controller('streams')
export class StreamsController {
  constructor(
    private readonly streams: StreamsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Public()
  @Get('pk/active')
  activePk() {
    return this.streams.activePk();
  }

  @Roles('ADMIN')
  @Post('pk')
  async startPk(@Body() dto: StartPkDto) {
    const session = await this.streams.startPk(dto.streamAId, dto.streamBId);
    this.chatGateway.announcePkStarted({
      id: session.id,
      streamAId: session.streamAId,
      streamBId: session.streamBId,
    });
    return session;
  }

  @Roles('ADMIN')
  @Post('pk/:id/end')
  async endPk(@Param('id', ParseIntPipe) id: number) {
    const result = await this.streams.endPk(id);
    this.chatGateway.announcePkEnded(id);
    return result;
  }

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

  @Roles('ADMIN')
  @Get(':id/admin')
  adminDetail(@Param('id', ParseIntPipe) id: number) {
    return this.streams.adminDetail(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateStreamDto) {
    return this.streams.create(dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStreamDto) {
    return this.streams.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.streams.remove(id);
  }
}
