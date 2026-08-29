import { OpnameStatus } from '@prisma/client';
import { DateHelper } from '../../src/common/helpers/date.helper';
import { Registry, getStock, reduceBatchFEFO, setStockQty } from './data';

export interface SeedOpname {
  id: string;
  unitId: string;
  scope: string;
  status: OpnameStatus;
  createdByKey: string;
  scheduledDaysAgo: number;
  items: { sku: string; variance: number; reason?: string }[];
}

export const OPNAMES: SeedOpname[] = [
  {
    id: 'opn-2026-08-001',
    unitId: 'unit-central',
    scope: 'Makanan & Minuman',
    status: OpnameStatus.CLOSED,
    createdByKey: 'gudang',
    scheduledDaysAgo: 3,
    items: [{ sku: 'IND-GOR-001', variance: -2, reason: 'Penyusutan/selisih hitung fisik' }],
  },
  {
    id: 'opn-2026-08-002',
    unitId: 'unit-central',
    scope: 'Minuman',
    status: OpnameStatus.RECONCILED,
    createdByKey: 'gudang',
    scheduledDaysAgo: 2,
    items: [{ sku: 'TEH-BTL-009', variance: 0 }],
  },
  {
    id: 'opn-2026-08-003',
    unitId: 'unit-cabang-1',
    scope: 'Susu & Minuman',
    status: OpnameStatus.IN_PROGRESS,
    createdByKey: 'kasir-cabang',
    scheduledDaysAgo: 1,
    items: [{ sku: 'SUS-UHT-010', variance: 0 }],
  },
  {
    id: 'opn-2026-08-004',
    unitId: 'unit-cabang-2',
    scope: 'Air Mineral',
    status: OpnameStatus.SCHEDULED,
    createdByKey: 'kasir-cabang',
    scheduledDaysAgo: 0,
    items: [{ sku: 'AQU-600-011', variance: 0 }],
  },
];

export async function seedOpnames(reg: Registry): Promise<void> {
  for (const o of OPNAMES) {
    const createdById = reg.users[o.createdByKey];
    if (!createdById) continue;

    await reg.prisma.stockOpnameSession.upsert({
      where: { id: o.id },
      update: { unitId: o.unitId, scope: o.scope, status: o.status, createdById },
      create: {
        id: o.id,
        unitId: o.unitId,
        scope: o.scope,
        status: o.status,
        scheduledAt: DateHelper.addDays(new Date(), -o.scheduledDaysAgo),
        createdById,
      },
    });

    for (let i = 0; i < o.items.length; i++) {
      const item = o.items[i];
      const productId = reg.products[item.sku];
      if (!productId) continue;

      const qtySystem = getStock(reg, productId, o.unitId).qty;
      const qtyPhysical = qtySystem + item.variance;

      await reg.prisma.stockOpnameItem.upsert({
        where: { id: `${o.id}-item-${i + 1}` },
        update: {
          productId,
          qtySystem,
          qtyPhysical,
          variance: item.variance,
          reason: item.reason ?? null,
          countedById: createdById,
        },
        create: {
          id: `${o.id}-item-${i + 1}`,
          sessionId: o.id,
          productId,
          qtySystem,
          qtyPhysical,
          variance: item.variance,
          reason: item.reason ?? null,
          countedById: createdById,
        },
      });

      if (o.status === OpnameStatus.CLOSED && item.variance !== 0) {
        setStockQty(reg, productId, o.unitId, qtyPhysical);
        reduceBatchFEFO(reg, productId, o.unitId, Math.abs(item.variance));
        if (item.variance > 0) {
          const { addToBatch } = await import('./data');
          addToBatch(reg, productId, o.unitId, item.variance, null);
        }
      }
    }
  }
}
