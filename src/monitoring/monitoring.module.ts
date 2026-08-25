import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionModule } from '../session/session.module';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { StreakService } from '../me/streak.service';

@Module({
  imports: [AuthModule, SessionModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, StreakService],
})
export class MonitoringModule {}
