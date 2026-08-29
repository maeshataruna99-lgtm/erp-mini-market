import {
  addAuditLog,
  assembleOpname,
  findById,
  findOne,
  findWhere,
  insert,
  nextId,
  setStock,
  updateById,
} from './db';
import type {
  OpnameItemRow,
  OpnameSessionRow,
  ProductRow,
  StockLevelRow,
} from './db';
import { httpError, lowerContains } from './helpers';
import type { CurrentUser as AuthUser } from './auth';
import type { OpnameSession } from '@/types';

export function listOpname(params: { page?: number; limit?: number; status?: string; search?: string }) {
  const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
  const limit = params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), 100) : 20;
  const rows = findWhere<OpnameSessionRow>('opnameSessions', (s) => {
    if (params.status && s.status !== params.status) return false;
    if (params.search && !lowerContains(s.scope, params.search)) return false;
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = rows.length;
  const items = rows.slice((page - 1) * limit, (page - 1) * limit + limit).map((s) => assembleOpname(s));
  return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export function getOpname(id: string): OpnameSession {
  const s = findById<OpnameSessionRow>('opnameSessions', id);
  if (!s) throw httpError('Sesi opname tidak ditemukan');
  return assembleOpname(s, true);
}

export function createOpname(body: { unitId: string; scope?: string; scheduledAt?: string }, user: AuthUser): OpnameSession {
  const row: OpnameSessionRow = {
    id: nextId(),
    unitId: body.unitId,
    scope: body.scope ?? null,
    status: 'SCHEDULED',
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt).toISOString() : new Date().toISOString(),
    createdById: user.id,
    createdAt: new Date().toISOString(),
  };
  insert<OpnameSessionRow>('opnameSessions', row);
  return assembleOpname(row);
}

export function startOpname(id: string, user: AuthUser): OpnameSession {
  const session = getOpname(id);
  if (session.status !== 'SCHEDULED') throw httpError('Sesi sudah dimulai atau selesai');

  const products = findWhere<ProductRow>('products', (p) =>
    session.scope && session.scope !== 'ALL' ? p.category === session.scope : true,
  );
  products.forEach((p) => {
    const existing = findOne<OpnameItemRow>('opnameItems', (i) => i.sessionId === id && i.productId === p.id);
    if (existing) return;
    insert<OpnameItemRow>('opnameItems', {
      id: nextId(),
      sessionId: id,
      productId: p.id,
      qtySystem: 0,
      qtyPhysical: 0,
      variance: 0,
      reason: null,
      countedById: user.id,
    });
  });
  updateById<OpnameSessionRow>('opnameSessions', id, { status: 'IN_PROGRESS' });
  return getOpname(id);
}

export function blindCount(id: string, body: { items: { productId: string; qtyPhysical: number; reason?: string }[] }, user: AuthUser): OpnameSession {
  const session = getOpname(id);
  if (session.status !== 'IN_PROGRESS') throw httpError('Sesi opname belum IN_PROGRESS');
  body.items.forEach((item) => {
    const existing = findOne<OpnameItemRow>('opnameItems', (i) => i.sessionId === id && i.productId === item.productId);
    if (existing) {
      updateById<OpnameItemRow>('opnameItems', existing.id, {
        qtyPhysical: item.qtyPhysical,
        reason: item.reason ?? null,
        countedById: user.id,
      });
    } else {
      insert<OpnameItemRow>('opnameItems', {
        id: nextId(),
        sessionId: id,
        productId: item.productId,
        qtySystem: 0,
        qtyPhysical: item.qtyPhysical,
        variance: 0,
        reason: item.reason ?? null,
        countedById: user.id,
      });
    }
  });
  return getOpname(id);
}

export function reconcileOpname(id: string, user: AuthUser): OpnameSession {
  const session = getOpname(id);
  const allowed = ['IN_PROGRESS', 'SCHEDULED'];
  if (!allowed.includes(session.status)) throw httpError('Sesi opname tidak bisa direconcile');

  const items = findWhere<OpnameItemRow>('opnameItems', (i) => i.sessionId === id);
  items.forEach((item) => {
    const stock = findOne<StockLevelRow>('stockLevels', (s) => s.productId === item.productId && s.unitId === session.unitId);
    const qtySystem = stock?.qty ?? 0;
    const variance = item.qtyPhysical - qtySystem;
    updateById<OpnameItemRow>('opnameItems', item.id, { qtySystem, variance });
    if (variance !== 0) {
      const adjusted = setStock(item.productId, session.unitId, item.qtyPhysical);
      addAuditLog(item.countedById, 'STOCK_ADJUSTMENT', 'StockLevel', adjusted.id, { qty: qtySystem }, { qty: item.qtyPhysical, reason: item.reason ?? null });
    }
  });

  updateById<OpnameSessionRow>('opnameSessions', id, { status: 'RECONCILED' });
  addAuditLog(user.id, 'OPNAME_RECONCILED', 'StockOpnameSession', id, { status: session.status }, { status: 'RECONCILED' });
  return getOpname(id);
}

export function closeOpname(id: string): OpnameSession {
  const session = getOpname(id);
  if (session.status !== 'RECONCILED') throw httpError('Sesi harus RECONCILED sebelum ditutup');
  updateById<OpnameSessionRow>('opnameSessions', id, { status: 'CLOSED' });
  return getOpname(id);
}
