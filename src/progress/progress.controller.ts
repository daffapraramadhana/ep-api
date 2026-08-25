import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProgressService } from './progress.service';

type AuthUser = { sub: string; role: string };

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private progress: ProgressService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.progress.get(user.sub);
  }
}
