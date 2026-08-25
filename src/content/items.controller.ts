import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ContentService } from './content.service';
import type { ItemPatch } from './content.service';

@Controller('admin/items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ItemsController {
  constructor(private content: ContentService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() patch: ItemPatch) {
    return this.content.updateItem(id, patch);
  }
}
