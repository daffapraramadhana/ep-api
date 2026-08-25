import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { AnswerService, STREAK_EVALUATOR } from './answer.service';

// TODO(Task 5): swap this stub for the real StreakService provider once the
// streak/milestone engine lands. answer.service.ts only depends on the
// StreakEvaluator interface + STREAK_EVALUATOR token, so this is the only
// wiring that needs to change.
const streakEvaluatorStub = {
  provide: STREAK_EVALUATOR,
  useValue: {
    evaluateAfterSession: () =>
      Promise.resolve({ streak: 0, changed: false, milestone: null }),
  },
};

@Module({
  imports: [AuthModule],
  controllers: [SessionController],
  providers: [SessionService, AnswerService, streakEvaluatorStub],
  exports: [SessionService],
})
export class SessionModule {}
