import { Injectable } from '@nestjs/common';
import { POStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DateHelper } from '../../common/helpers/date.helper';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [lowStockProducts, pendingPo, receivingsToday, expiringSoon, productCount, totalStockQty] =
      await Promise.all([
        this.fetchLowStockProducts(),
        this.prisma.purchaseOrder.count({
          where: { status: { in: [POStatus.PENDING_APPROVAL, POStatus.DRAFT] } },
        }),
        this.prisma.goodsReceiving.count({
          where: { createdAt: { gte: DateHelper.addDays(new Date(), -1) } },
        }),
        this.prisma.productBatch.count({
          where: {
            expiryDate: { gte: new Date(), lte: DateHelper.addDays(new Date(), 30) },
          },
        }),
        this.prisma.product.count(),
        this.prisma.stockLevel.aggregate({ _sum: { qty: true } }),
      ]);

    return {
      inventoryQty: totalStockQty._sum.qty ?? 0,
      lowStock: lowStockProducts.length,
      pendingPo,
      receivingsToday,
      expiringSoon,
      productCount,
    };
  }

  async lowStock(unitId?: string, limit = 20) {
    const products = await this.fetchLowStockProducts(unitId);
    return products.slice(0, limit);
  }

  async expiry(unitId?: string, limit = 20) {
    const where = {
      expiryDate: { gte: new Date(), lte: DateHelper.addDays(new Date(), 30) },
      ...(unitId ? { unitId } : {}),
    };
    return this.prisma.productBatch.findMany({
      where,
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
      take: limit,
      orderBy: { expiryDate: 'asc' },
    });
  }

  async weeklyTrend(days = 7) {
    const sinceStart = new Date();
    sinceStart.setHours(0, 0, 0, 0);
    sinceStart.setDate(sinceStart.getDate() - (days - 1));

    const [receivings, mutations] = await Promise.all([
      this.prisma.goodsReceiving.findMany({
        where: { createdAt: { gte: sinceStart } },
        select: { createdAt: true },
      }),
      this.prisma.stockMutation.findMany({
        where: { createdAt: { gte: sinceStart } },
        select: { createdAt: true },
      }),
    ]);

    const labels: string[] = [];
    const values: number[] = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(sinceStart);
      day.setDate(sinceStart.getDate() + i);
      const dayKey = DateHelper.toDateKey(day);
      labels.push(day.toLocaleDateString('id-ID', { weekday: 'short' }));
      const rcvCount = receivings.filter(
        (r) => DateHelper.toDateKey(r.createdAt) === dayKey,
      ).length;
      const mutCount = mutations.filter(
        (m) => DateHelper.toDateKey(m.createdAt) === dayKey,
      ).length;
      values.push(rcvCount + mutCount);
    }

    return { labels, values };
  }

  async auditLogs(limit = 20) {
    return this.prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async fetchLowStockProducts(unitId?: string) {
    const products = await this.prisma.product.findMany({
      include: {
        stockLevels: unitId
          ? { where: { unitId } }
          : { include: { unit: true } },
      },
    });
    return products.filter((p) => p.stockLevels.some((s) => s.qty < p.minStock));
  }
}
