// apps/api/src/modules/admin-modules.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminModulesService } from './admin-modules.service';
import type { ChapterInput, ModuleInput } from './admin-modules.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminModulesController {
  constructor(private svc: AdminModulesService) {}

  @Get('modules')
  list(@Query() q: { level?: string; status?: string }) {
    return this.svc.listModules(q);
  }

  @Post('modules')
  create(@Body() dto: ModuleInput) {
    return this.svc.createModule(dto);
  }

  @Post('modules/preview')
  preview(@Body('body') body: unknown) {
    return this.svc.preview(body);
  }

  @Get('modules/:id')
  get(@Param('id') id: string) {
    return this.svc.getModule(id);
  }

  @Patch('modules/:id')
  update(@Param('id') id: string, @Body() dto: ModuleInput) {
    return this.svc.updateModule(id, dto);
  }

  @Post('modules/:id/chapters')
  createChapter(@Param('id') id: string, @Body() dto: ChapterInput) {
    return this.svc.createChapter(id, dto);
  }

  @Get('chapters/:id')
  getChapter(@Param('id') id: string) {
    return this.svc.getChapter(id);
  }

  @Patch('chapters/:id')
  updateChapter(@Param('id') id: string, @Body() dto: ChapterInput) {
    return this.svc.updateChapter(id, dto);
  }

  @Delete('chapters/:id')
  deleteChapter(@Param('id') id: string) {
    return this.svc.deleteChapter(id);
  }

  @Post('chapters/:id/move')
  move(@Param('id') id: string, @Body('direction') direction: unknown) {
    return this.svc.moveChapter(id, direction);
  }

  @Post('chapters/:id/quiz')
  createQuiz(@Param('id') id: string) {
    return this.svc.createQuiz(id);
  }

  @Patch('chapters/:id/quiz')
  linkQuiz(@Param('id') id: string, @Body('lessonId') lessonId: unknown) {
    return this.svc.linkQuiz(id, lessonId);
  }
}
