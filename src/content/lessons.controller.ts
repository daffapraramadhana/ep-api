import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ContentService } from './content.service';
import type { LessonListQuery, LessonPatch } from './content.service';

@Controller('admin/lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class LessonsController {
  constructor(private content: ContentService) {}

  @Get()
  list(@Query() query: LessonListQuery) {
    return this.content.listLessons(query);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() patch: LessonPatch) {
    return this.content.updateLesson(id, patch);
  }

  @Get(':id/items')
  items(@Param('id') id: string) {
    return this.content.listLessonItems(id);
  }
}
