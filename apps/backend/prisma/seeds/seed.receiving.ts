import { POStatus, ReceivingStatus } from '@prisma/client';
import { DateHelper } from '../../src/common/helpers/date.helper';
import { Registry, addStockQty, addToBatch } from './data';

export interface SeedReceiving {
  id: string;
  poId: string;
  unitId: string;
  receivedByKey: string;
  daysAgo: number;
  items: { sku: string; qtyOrdered: number; qtyReceived: number; expiryInDays?: number }[];
}

export const RECEIVINGS: SeedReceiving[] = [
  {
    id: 'recv-1',
    poId: 'po-2026-08-001',
    unitId: 'unit-central',
    receivedByKey: 'gudang',
    daysAgo: 4,
    items: [{ sku: 'IND-GOR-001', qtyOrdered: 100, qtyReceived: 100 }],
  },
  {
    id: 'recv-2',
    poId: 'po-2026-08-003',
    unitId: 'unit-central',
    receivedByKey: 'gudang',
    daysAgo: 2,
    items: [
      { sku: 'AQU-600-011', qtyOrdered: 50, qtyReceived: 30, expiryInDays: 40 },
    ],
  },
];

export async function seedReceivings(reg: Registry): Promise<void> {
  for (const r of RECEIVINGS) {
    const receivedById = reg.users[r.receivedByKey];
    if (!receivedById) continue;

    const po = await reg.prisma.purchaseOrder.findUnique({ where: { id: r.poId } });
    if (!po) continue;

    const allItems = await reg.prisma.purchaseOrderItem.findMany({ where: { poId: r.poId } });
    const allFull = allItems.every(
      (it) => r.items.find((i) => reg.products[i.sku] === it.productId)?.qtyReceived === it.qtyOrder,
    );

    const poStatus: POStatus = allFull ? POStatus.COMPLETED : POStatus.PARTIAL;
    const recvStatus: ReceivingStatus = allFull ? ReceivingStatus.COMPLETED : ReceivingStatus.PARTIAL;
    const hasDiscrepancy = !allFull;

    await reg.prisma.goodsReceiving.upsert({
      where: { id: r.id },
      update: {
        poId: r.poId,
        receivedById,
        unitId: r.unitId,
        status: recvStatus,
        hasDiscrepancy,
      },
      create: {
        id: r.id,
        poId: r.poId,
        receivedById,
        unitId: r.unitId,
        status: recvStatus,
        hasDiscrepancy,
        createdAt: DateHelper.addDays(new Date(), -r.daysAgo),
      },
    });

    for (let i = 0; i < r.items.length; i++) {
      const item = r.items[i];
      const productId = reg.products[item.sku];
      if (!productId) continue;
      const discrepancyPct =
        item.qtyOrdered > 0
          ? Math.round(((item.qtyOrdered - item.qtyReceived) / item.qtyOrdered) * 10000) / 100
          : 0;
      await reg.prisma.goodsReceivingItem.upsert({
        where: { id: `${r.id}-item-${i + 1}` },
        update: { productId, qtyOrdered: item.qtyOrdered, qtyReceived: item.qtyReceived, discrepancyPct },
        create: {
          id: `${r.id}-item-${i + 1}`,
          receivingId: r.id,
          productId,
          qtyOrdered: item.qtyOrdered,
          qtyReceived: item.qtyReceived,
          discrepancyPct,
        },
      });

      addStockQty(reg, productId, r.unitId, item.qtyReceived);
      addToBatch(
        reg,
        productId,
        r.unitId,
        item.qtyReceived,
        item.expiryInDays ? DateHelper.addDays(new Date(), item.expiryInDays) : null,
      );
    }

    await reg.prisma.purchaseOrder.update({
      where: { id: r.poId },
      data: { status: poStatus },
    });
  }
}
