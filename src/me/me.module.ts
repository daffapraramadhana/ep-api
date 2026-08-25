import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionModule } from '../session/session.module';
import { MeController } from './me.controller';
import { StreakService } from './streak.service';
import { SummaryService } from './summary.service';

@Module({
  imports: [AuthModule, SessionModule],
  controllers: [MeController],
  providers: [StreakService, SummaryService],
})
export class MeModule {}
