import { POStatus } from '@prisma/client';
import { DateHelper } from '../../src/common/helpers/date.helper';
import { Registry } from './data';

export interface SeedPO {
  id: string;
  poNumber: string;
  supplierId: string;
  status: POStatus;
  createdByKey: string;
  approvedByKey?: string;
  sentDaysAgo?: number;
  notes?: string;
  items: { sku: string; qtyOrder: number; price: number }[];
}

export const POS: SeedPO[] = [
  {
    id: 'po-2026-08-001',
    poNumber: 'PO-2026-08-001',
    supplierId: 'sup-indofood',
    status: POStatus.SENT,
    createdByKey: 'kasir',
    approvedByKey: 'manager',
    sentDaysAgo: 5,
    notes: 'Pengadaan mingguan Indomie',
    items: [{ sku: 'IND-GOR-001', qtyOrder: 100, price: 2500 }],
  },
  {
    id: 'po-2026-08-002',
    poNumber: 'PO-2026-08-002',
    supplierId: 'sup-mayora',
    status: POStatus.SENT,
    createdByKey: 'kasir',
    approvedByKey: 'manager',
    sentDaysAgo: 4,
    notes: 'Teh botol untuk stok minuman',
    items: [{ sku: 'TEH-BTL-009', qtyOrder: 40, price: 3500 }],
  },
  {
    id: 'po-2026-08-003',
    poNumber: 'PO-2026-08-003',
    supplierId: 'sup-mayora',
    status: POStatus.SENT,
    createdByKey: 'kasir',
    approvedByKey: 'manager',
    sentDaysAgo: 3,
    notes: 'Air mineral ukuran sedang',
    items: [{ sku: 'AQU-600-011', qtyOrder: 50, price: 3000 }],
  },
  {
    id: 'po-2026-08-004',
    poNumber: 'PO-2026-08-004',
    supplierId: 'sup-sosro',
    status: POStatus.PENDING_APPROVAL,
    createdByKey: 'kasir',
    notes: 'Menunggu approval manager',
    items: [{ sku: 'NUT-TEA-013', qtyOrder: 24, price: 4000 }],
  },
  {
    id: 'po-2026-08-005',
    poNumber: 'PO-2026-08-005',
    supplierId: 'sup-unilever',
    status: POStatus.APPROVED,
    createdByKey: 'gudang',
    approvedByKey: 'manager',
    notes: 'Sabun mandi bulanan',
    items: [{ sku: 'SAB-LIF-018', qtyOrder: 60, price: 4000 }],
  },
  {
    id: 'po-2026-08-006',
    poNumber: 'PO-2026-08-006',
    supplierId: 'sup-wings',
    status: POStatus.DRAFT,
    createdByKey: 'gudang',
    notes: 'Draft pengadaan deterjen',
    items: [{ sku: 'DET-RIN-020', qtyOrder: 24, price: 18000 }],
  },
  {
    id: 'po-2026-08-007',
    poNumber: 'PO-2026-08-007',
    supplierId: 'sup-indofood',
    status: POStatus.CANCELLED,
    createdByKey: 'kasir',
    approvedByKey: 'manager',
    notes: 'Dibatalkan karena stok cukup',
    items: [{ sku: 'MIE-SDP-002', qtyOrder: 30, price: 2400 }],
  },
];

export async function seedPOs(reg: Registry): Promise<void> {
  for (const po of POS) {
    const createdById = reg.users[po.createdByKey];
    if (!createdById) continue;
    await reg.prisma.purchaseOrder.upsert({
      where: { id: po.id },
      update: {
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        status: po.status,
        createdById,
        approvedById: po.approvedByKey ? reg.users[po.approvedByKey] : null,
        sentAt: po.sentDaysAgo ? DateHelper.addDays(new Date(), -po.sentDaysAgo) : null,
        notes: po.notes,
      },
      create: {
        id: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        status: po.status,
        createdById,
        approvedById: po.approvedByKey ? reg.users[po.approvedByKey] : null,
        sentAt: po.sentDaysAgo ? DateHelper.addDays(new Date(), -po.sentDaysAgo) : null,
        notes: po.notes,
      },
    });

    for (let i = 0; i < po.items.length; i++) {
      const item = po.items[i];
      const productId = reg.products[item.sku];
      if (!productId) continue;
      await reg.prisma.purchaseOrderItem.upsert({
        where: { id: `${po.id}-item-${i + 1}` },
        update: { productId, qtyOrder: item.qtyOrder, price: item.price },
        create: {
          id: `${po.id}-item-${i + 1}`,
          poId: po.id,
          productId,
          qtyOrder: item.qtyOrder,
          price: item.price,
        },
      });
    }
  }
}
