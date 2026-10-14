// apps/api/src/modules/modules.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ModulesService } from './modules.service';

type AuthUser = { sub: string; role: string };

@Controller('modules')
@UseGuards(JwtAuthGuard)
export class ModulesController {
  constructor(private modules: ModulesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.modules.list(user.sub);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.modules.detail(user.sub, slug);
  }

  @Get(':slug/chapters/:order')
  chapter(
    @Param('slug') slug: string,
    @Param('order') order: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.modules.chapter(user.sub, slug, order);
  }
}
