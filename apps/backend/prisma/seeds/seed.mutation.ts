import { MutationStatus } from '@prisma/client';
import { DateHelper } from '../../src/common/helpers/date.helper';
import { Registry, addStockQty, addToBatch, reduceBatchFEFO, sourceExpiryFEFO } from './data';

export interface SeedMutation {
  id: string;
  mutationNumber: string;
  fromUnitId: string;
  toUnitId: string;
  status: MutationStatus;
  requestedByKey: string;
  approvedByKey?: string;
  daysAgo: number;
  items: { sku: string; qty: number }[];
}

export const MUTATIONS: SeedMutation[] = [
  {
    id: 'mut-2026-08-001',
    mutationNumber: 'MUT-2026-08-001',
    fromUnitId: 'unit-central',
    toUnitId: 'unit-cabang-1',
    status: MutationStatus.RECEIVED,
    requestedByKey: 'gudang',
    approvedByKey: 'manager',
    daysAgo: 2,
    items: [
      { sku: 'TEH-BTL-009', qty: 30 },
      { sku: 'SUS-UHT-010', qty: 30 },
    ],
  },
  {
    id: 'mut-2026-08-002',
    mutationNumber: 'MUT-2026-08-002',
    fromUnitId: 'unit-central',
    toUnitId: 'unit-cabang-2',
    status: MutationStatus.IN_TRANSIT,
    requestedByKey: 'gudang',
    approvedByKey: 'manager',
    daysAgo: 1,
    items: [{ sku: 'AQU-600-011', qty: 12 }],
  },
  {
    id: 'mut-2026-08-003',
    mutationNumber: 'MUT-2026-08-003',
    fromUnitId: 'unit-central',
    toUnitId: 'unit-cabang-1',
    status: MutationStatus.APPROVED,
    requestedByKey: 'gudang',
    approvedByKey: 'manager',
    daysAgo: 1,
    items: [{ sku: 'IND-GOR-001', qty: 20 }],
  },
  {
    id: 'mut-2026-08-004',
    mutationNumber: 'MUT-2026-08-004',
    fromUnitId: 'unit-central',
    toUnitId: 'unit-cabang-2',
    status: MutationStatus.REQUESTED,
    requestedByKey: 'gudang',
    daysAgo: 0,
    items: [{ sku: 'GUL-PAS-004', qty: 10 }],
  },
];

export async function seedMutations(reg: Registry): Promise<void> {
  for (const m of MUTATIONS) {
    const requestedById = reg.users[m.requestedByKey];
    if (!requestedById) continue;

    await reg.prisma.stockMutation.upsert({
      where: { id: m.id },
      update: {
        mutationNumber: m.mutationNumber,
        fromUnitId: m.fromUnitId,
        toUnitId: m.toUnitId,
        status: m.status,
        requestedById,
        approvedById: m.approvedByKey ? reg.users[m.approvedByKey] : null,
      },
      create: {
        id: m.id,
        mutationNumber: m.mutationNumber,
        fromUnitId: m.fromUnitId,
        toUnitId: m.toUnitId,
        status: m.status,
        requestedById,
        approvedById: m.approvedByKey ? reg.users[m.approvedByKey] : null,
        createdAt: DateHelper.addDays(new Date(), -m.daysAgo),
      },
    });

    for (let i = 0; i < m.items.length; i++) {
      const item = m.items[i];
      const productId = reg.products[item.sku];
      if (!productId) continue;
      await reg.prisma.stockMutationItem.upsert({
        where: { id: `${m.id}-item-${i + 1}` },
        update: { productId, qty: item.qty },
        create: { id: `${m.id}-item-${i + 1}`, mutationId: m.id, productId, qty: item.qty },
      });

      if (m.status === MutationStatus.RECEIVED) {
        addStockQty(reg, productId, m.fromUnitId, -item.qty);
        addStockQty(reg, productId, m.toUnitId, item.qty);
        const expiry = sourceExpiryFEFO(reg, productId, m.fromUnitId);
        reduceBatchFEFO(reg, productId, m.fromUnitId, item.qty);
        addToBatch(reg, productId, m.toUnitId, item.qty, expiry);
      }
    }
  }
}
