import {
  addAuditLog,
  assembleReceiving,
  findById,
  findWhere,
  insert,
  nextId,
  updateById,
  upsertStock,
} from './db';
import type {
  PoItemRow,
  PoRow,
  ReceivingItemRow,
  ReceivingRow,
  SupplierRow,
} from './db';
import { httpError, lowerContains } from './helpers';
import type { CurrentUser as AuthUser } from './auth';
import type { GoodsReceiving } from '@/types';

export function listReceiving(params: { page?: number; limit?: number; search?: string }) {
  const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
  const limit = params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), 100) : 20;
  let rows = findWhere<ReceivingRow>('goodsReceivings', (r) => {
    if (!params.search) return true;
    const po = findById<PoRow>('purchaseOrders', r.poId);
    const supplier = po ? findById<SupplierRow>('suppliers', po.supplierId) : undefined;
    return lowerContains(po?.poNumber, params.search) || lowerContains(supplier?.name, params.search);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = rows.length;
  const items = rows.slice((page - 1) * limit, (page - 1) * limit + limit).map((r) => assembleReceiving(r));
  return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export function getReceiving(id: string): GoodsReceiving {
  const r = findById<ReceivingRow>('goodsReceivings', id);
  if (!r) throw httpError('Goods Receiving tidak ditemukan');
  return assembleReceiving(r, true);
}

export function createReceiving(body: { poId: string; unitId: string }, user: AuthUser): GoodsReceiving {
  const po = findById<PoRow>('purchaseOrders', body.poId);
  if (!po) throw httpError('Purchase Order tidak ditemukan');
  if (po.status !== 'SENT') throw httpError('Hanya PO berstatus SENT yang dapat diterima');
  const existingCompleted = findWhere<ReceivingRow>('goodsReceivings', (r) => r.poId === body.poId).some((r) => r.status === 'COMPLETED');
  if (existingCompleted) throw httpError('PO ini sudah pernah diterima penuh');

  const receiving: ReceivingRow = {
    id: nextId(),
    poId: po.id,
    receivedById: user.id,
    unitId: body.unitId,
    status: 'DRAFT',
    hasDiscrepancy: false,
    createdAt: new Date().toISOString(),
  };
  insert<ReceivingRow>('goodsReceivings', receiving);

  const poItems = findWhere<PoItemRow>('poItems', (i) => i.poId === po.id);
  poItems.forEach((item) => {
    insert<ReceivingItemRow>('receivingItems', {
      id: nextId(),
      receivingId: receiving.id,
      productId: item.productId,
      qtyOrdered: item.qtyOrder,
      qtyReceived: 0,
      discrepancyPct: 0,
    });
  });
  return assembleReceiving(receiving, true);
}

export function confirmReceiving(id: string, body: { items: { id: string; qtyReceived: number }[] }, user: AuthUser): GoodsReceiving {
  const receiving = findById<ReceivingRow>('goodsReceivings', id);
  if (!receiving) throw httpError('Goods Receiving tidak ditemukan');
  if (receiving.status === 'COMPLETED') throw httpError('Goods Receiving sudah dikonfirmasi');

  const qtyMap = new Map(body.items.map((i) => [i.id, i.qtyReceived]));
  const items = findWhere<ReceivingItemRow>('receivingItems', (i) => i.receivingId === id);

  let hasDiscrepancy = false;
  let isPartial = false;
  const updates = items.map((item) => {
    const qtyReceived = qtyMap.get(item.id) ?? item.qtyReceived;
    if (qtyReceived < item.qtyOrdered) isPartial = true;
    const discrepancyPct =
      item.qtyOrdered > 0
        ? Number((((item.qtyOrdered - qtyReceived) / item.qtyOrdered) * 100).toFixed(2))
        : 0;
    if (discrepancyPct > 5) hasDiscrepancy = true;
    return { item, qtyReceived, discrepancyPct };
  });

  const newStatus = isPartial ? 'PARTIAL' : 'COMPLETED';
  updates.forEach((u) => {
    updateById<ReceivingItemRow>('receivingItems', u.item.id, {
      qtyReceived: u.qtyReceived,
      discrepancyPct: u.discrepancyPct,
    });
    upsertStock(u.item.productId, receiving.unitId, u.qtyReceived);
    if (u.discrepancyPct > 5) {
      addAuditLog(user.id, 'DISCREPANCY_ALERT', 'GoodsReceivingItem', u.item.id, undefined, { discrepancyPct: u.discrepancyPct });
    }
  });

  updateById<ReceivingRow>('goodsReceivings', id, { status: newStatus, hasDiscrepancy });
  updateById<PoRow>('purchaseOrders', receiving.poId, { status: isPartial ? 'PARTIAL' : 'COMPLETED', updatedAt: new Date().toISOString() });

  return getReceiving(id);
}
