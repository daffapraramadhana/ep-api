import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { AnswerService, STREAK_EVALUATOR } from './answer.service';
import { StreakService } from '../me/streak.service';

const streakEvaluatorProvider = {
  provide: STREAK_EVALUATOR,
  useExisting: StreakService,
};

@Module({
  imports: [AuthModule],
  controllers: [SessionController],
  providers: [
    SessionService,
    AnswerService,
    StreakService,
    streakEvaluatorProvider,
  ],
  exports: [SessionService],
})
export class SessionModule {}
