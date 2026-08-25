import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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

  @Get('employees')
  employees() {
    return this.monitoring.getEmployees();
  }

  @Get('employees/:id')
  employeeDetail(@Param('id') id: string) {
    return this.monitoring.getEmployeeDetail(id);
  }
}
