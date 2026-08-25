import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionModule } from '../session/session.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { StreakService } from '../me/streak.service';

@Module({
  imports: [AuthModule, SessionModule],
  controllers: [ProgressController],
  providers: [ProgressService, StreakService],
})
export class ProgressModule {}
