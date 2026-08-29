import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Audit Log')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Audit log terbaru' })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query('limit') limit?: number) {
    return this.dashboardService.auditLogs(limit ? Number(limit) : 20);
  }
}
