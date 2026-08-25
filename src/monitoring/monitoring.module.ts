import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { StreakService } from '../me/streak.service';

@Module({
  imports: [AuthModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, StreakService],
})
export class MonitoringModule {}
