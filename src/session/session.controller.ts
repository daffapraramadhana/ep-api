import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionService } from './session.service';
import { AnswerService } from './answer.service';

type AuthUser = { sub: string; role: string };

@Controller('session')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(
    private session: SessionService,
    private answerService: AnswerService,
  ) {}

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

  @Post(':id/answer')
  answer(
    @Param('id') id: string,
    @Body() body: { itemId: string; answer: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.answerService.submit(user.sub, id, body.itemId, body.answer);
  }
}
