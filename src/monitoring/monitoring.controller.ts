import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MonitoringService } from './monitoring.service';

@Controller('admin/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MonitoringController {
  constructor(private monitoring: MonitoringService) {}

  @Get('overview')
  overview() {
    return this.monitoring.getOverview();
  }
}
