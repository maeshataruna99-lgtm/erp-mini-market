import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan statistik dashboard' })
  summary() {
    return this.dashboardService.summary();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Produk dengan stok di bawah minStock' })
  @ApiQuery({ name: 'unitId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  lowStock(@Query('unitId') unitId?: string, @Query('limit') limit?: number) {
    return this.dashboardService.lowStock(unitId, limit ? Number(limit) : 20);
  }

  @Get('expiry')
  @ApiOperation({ summary: 'Batch mendekati kadaluarsa (FEFO, 30 hari)' })
  @ApiQuery({ name: 'unitId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  expiry(@Query('unitId') unitId?: string, @Query('limit') limit?: number) {
    return this.dashboardService.expiry(unitId, limit ? Number(limit) : 20);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Tren aktivitas stok mingguan (receiving + mutasi)' })
  @ApiQuery({ name: 'days', required: false })
  weeklyTrend(@Query('days') days?: number) {
    return this.dashboardService.weeklyTrend(days ? Number(days) : 7);
  }
}
