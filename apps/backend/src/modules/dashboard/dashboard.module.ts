import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AuditLogsController } from './audit-logs.controller';

@Module({
  controllers: [DashboardController, AuditLogsController],
  providers: [DashboardService],
})
export class DashboardModule {}
