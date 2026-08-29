import {
  addAuditLog,
  assemblePo,
  findById,
  findWhere,
  insert,
  nextId,
  removeWhere,
  updateById,
} from './db';
import type { PoItemRow, PoRow, SupplierRow } from './db';
import { buildMeta, httpError, lowerContains, normalizePagination } from './helpers';
import { nextCode } from './sequence';
import type { CurrentUser as AuthUser } from './auth';
import type { POStatus, PurchaseOrder } from '@/types';

export function listPo(params: { page?: number; limit?: number; search?: string; status?: POStatus }) {
  const { page, limit, skip } = normalizePagination(params.page, params.limit);
  let rows = findWhere<PoRow>('purchaseOrders', (p) => {
    if (params.status && p.status !== params.status) return false;
    if (params.search) {
      const supplier = findById<SupplierRow>('suppliers', p.supplierId);
      if (!lowerContains(p.poNumber, params.search) && !lowerContains(supplier?.name, params.search)) return false;
    }
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = rows.length;
  const items = rows.slice(skip, skip + limit).map((p) => assemblePo(p));
  return { data: items, meta: buildMeta(page, limit, total) };
}

export function getPo(id: string): PurchaseOrder {
  const p = findById<PoRow>('purchaseOrders', id);
  if (!p) throw httpError('Purchase Order tidak ditemukan');
  return assemblePo(p, true);
}

function assertCanEdit(po: PoRow, user: AuthUser): void {
  const isManager = user.role === 'ADMIN' || user.role === 'MANAGER';
  if (!isManager && po.createdById !== user.id) {
    throw httpError('Hanya pembuat PO atau MANAJER yang dapat mengubah PO ini');
  }
}

export function createPo(body: { supplierId: string; notes?: string; items: { productId: string; qtyOrder: number; price: number }[] }, user: AuthUser): PurchaseOrder {
  const now = new Date().toISOString();
  const po: PoRow = {
    id: nextId(),
    poNumber: nextCode('PO'),
    supplierId: body.supplierId,
    status: 'DRAFT',
    createdById: user.id,
    approvedById: null,
    sentAt: null,
    notes: body.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  insert<PoRow>('purchaseOrders', po);
  body.items.forEach((item) => {
    insert<PoItemRow>('poItems', {
      id: nextId(),
      poId: po.id,
      productId: item.productId,
      qtyOrder: item.qtyOrder,
      price: item.price,
    });
  });
  return assemblePo(po, true);
}

export function submitPo(id: string, user: AuthUser): PurchaseOrder {
  const po = findById<PoRow>('purchaseOrders', id) ?? (() => { throw httpError('Purchase Order tidak ditemukan'); })();
  assertCanEdit(po, user);
  if (po.status !== 'DRAFT') throw httpError('Hanya PO dengan status DRAFT yang bisa disubmit');
  const now = new Date().toISOString();
  updateById<PoRow>('purchaseOrders', id, { status: 'PENDING_APPROVAL', updatedAt: now });
  return assemblePo(findById<PoRow>('purchaseOrders', id)!);
}

export function approvePo(id: string, user: AuthUser): PurchaseOrder {
  const po = findById<PoRow>('purchaseOrders', id) ?? (() => { throw httpError('Purchase Order tidak ditemukan'); })();
  if (po.status !== 'PENDING_APPROVAL') throw httpError('Hanya PO dengan status PENDING_APPROVAL yang bisa diapprove');
  const now = new Date().toISOString();
  updateById<PoRow>('purchaseOrders', id, { status: 'APPROVED', approvedById: user.id, updatedAt: now });
  addAuditLog(user.id, 'PO_APPROVED', 'PurchaseOrder', id, { status: po.status }, { status: 'APPROVED' });
  return assemblePo(findById<PoRow>('purchaseOrders', id)!);
}

export function sendPo(id: string): PurchaseOrder {
  const po = findById<PoRow>('purchaseOrders', id) ?? (() => { throw httpError('Purchase Order tidak ditemukan'); })();
  if (po.status !== 'APPROVED') throw httpError('Hanya PO dengan status APPROVED yang bisa dikirim');
  const now = new Date().toISOString();
  updateById<PoRow>('purchaseOrders', id, { status: 'SENT', sentAt: now, updatedAt: now });
  return assemblePo(findById<PoRow>('purchaseOrders', id)!);
}

export function cancelPo(id: string, user: AuthUser): PurchaseOrder {
  const po = findById<PoRow>('purchaseOrders', id) ?? (() => { throw httpError('Purchase Order tidak ditemukan'); })();
  assertCanEdit(po, user);
  const allowed: POStatus[] = ['DRAFT', 'PENDING_APPROVAL'];
  if (!allowed.includes(po.status)) throw httpError('PO hanya bisa dibatalkan saat DRAFT atau PENDING_APPROVAL');
  const now = new Date().toISOString();
  updateById<PoRow>('purchaseOrders', id, { status: 'CANCELLED', updatedAt: now });
  return assemblePo(findById<PoRow>('purchaseOrders', id)!);
}

export function removePo(id: string, user: AuthUser): { message: string } {
  const po = findById<PoRow>('purchaseOrders', id) ?? (() => { throw httpError('Purchase Order tidak ditemukan'); })();
  assertCanEdit(po, user);
  if (po.status !== 'DRAFT') throw httpError('Hanya PO dengan status DRAFT yang bisa dihapus');
  removeWhere<PoRow>('purchaseOrders', (p) => p.id === id);
  removeWhere<PoItemRow>('poItems', (i) => i.poId === id);
  return { message: 'PO berhasil dihapus' };
}
