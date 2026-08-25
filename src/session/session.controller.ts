import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionService } from './session.service';

type AuthUser = { sub: string; role: string };

@Controller('session')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private session: SessionService) {}

  @Post('today')
  today(@CurrentUser() user: AuthUser) {
    return this.session.getOrCreateToday(user.sub);
  }

  @Post('replay')
  replay(@Body() body: { lessonId: string }, @CurrentUser() user: AuthUser) {
    return this.session.replay(user.sub, body.lessonId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.session.view(id, user.sub);
  }
}
