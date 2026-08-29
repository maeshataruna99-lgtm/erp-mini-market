import {
  addAuditLog,
  assembleMutation,
  findById,
  findOne,
  findWhere,
  insert,
  nextId,
  updateById,
  upsertStock,
} from './db';
import type {
  MutationItemRow,
  MutationRow,
  ProductRow,
  StockLevelRow,
  UnitRow,
} from './db';
import { buildMeta, httpError, lowerContains, normalizePagination } from './helpers';
import { nextCode } from './sequence';
import type { CurrentUser as AuthUser } from './auth';
import type { MutationStatus, StockMutation } from '@/types';

export function listMutation(params: { page?: number; limit?: number; status?: MutationStatus; search?: string }) {
  const { page, limit, skip } = normalizePagination(params.page, params.limit);
  const rows = findWhere<MutationRow>('stockMutations', (m) => {
    if (params.status && m.status !== params.status) return false;
    if (params.search) {
      const from = findById<UnitRow>('units', m.fromUnitId);
      const to = findById<UnitRow>('units', m.toUnitId);
      if (!lowerContains(m.mutationNumber, params.search) && !lowerContains(from?.name, params.search) && !lowerContains(to?.name, params.search)) return false;
    }
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = rows.length;
  const items = rows.slice(skip, skip + limit).map((m) => assembleMutation(m));
  return { data: items, meta: buildMeta(page, limit, total) };
}

export function getMutation(id: string): StockMutation {
  const m = findById<MutationRow>('stockMutations', id);
  if (!m) throw httpError('Mutasi tidak ditemukan');
  return assembleMutation(m, true);
}

function assertStatus(current: string, allowed: MutationStatus[]): void {
  if (!allowed.includes(current as MutationStatus)) {
    throw httpError(`Status mutasi ${current} tidak mengizinkan aksi ini`);
  }
}

export function createMutation(body: { fromUnitId: string; toUnitId: string; items: { productId: string; qty: number }[] }, user: AuthUser): StockMutation {
  if (body.fromUnitId === body.toUnitId) throw httpError('Unit asal dan tujuan tidak boleh sama');
  const mutation: MutationRow = {
    id: nextId(),
    mutationNumber: nextCode('MUT'),
    fromUnitId: body.fromUnitId,
    toUnitId: body.toUnitId,
    status: 'REQUESTED',
    requestedById: user.id,
    approvedById: null,
    createdAt: new Date().toISOString(),
  };
  insert<MutationRow>('stockMutations', mutation);
  body.items.forEach((item) => {
    insert<MutationItemRow>('mutationItems', {
      id: nextId(),
      mutationId: mutation.id,
      productId: item.productId,
      qty: item.qty,
    });
  });
  return assembleMutation(mutation, true);
}

export function approveMutation(id: string, user: AuthUser): StockMutation {
  const m = getMutation(id);
  assertStatus(m.status, ['REQUESTED']);
  updateById<MutationRow>('stockMutations', id, { status: 'APPROVED', approvedById: user.id });
  addAuditLog(user.id, 'MUTATION_APPROVED', 'StockMutation', id, { status: m.status }, { status: 'APPROVED' });
  return getMutation(id);
}

export function rejectMutation(id: string): StockMutation {
  const m = getMutation(id);
  assertStatus(m.status, ['REQUESTED']);
  updateById<MutationRow>('stockMutations', id, { status: 'REJECTED' });
  return getMutation(id);
}

export function pickMutation(id: string): StockMutation {
  const m = getMutation(id);
  assertStatus(m.status, ['APPROVED']);
  updateById<MutationRow>('stockMutations', id, { status: 'IN_TRANSIT' });
  return getMutation(id);
}

export function receiveMutation(id: string, user: AuthUser): StockMutation {
  const m = getMutation(id);
  assertStatus(m.status, ['IN_TRANSIT']);

  const items = findWhere<MutationItemRow>('mutationItems', (i) => i.mutationId === id);
  items.forEach((item) => {
    const fromStock = findOne<StockLevelRow>('stockLevels', (s) => s.productId === item.productId && s.unitId === m.fromUnitId);
    const product = findById<ProductRow>('products', item.productId);
    if (!fromStock || fromStock.qty < item.qty) {
      throw httpError(`Stok tidak cukup di unit asal untuk ${product?.name ?? 'produk'}`);
    }
    upsertStock(item.productId, m.fromUnitId, -item.qty);
    upsertStock(item.productId, m.toUnitId, item.qty);
    addAuditLog(
      user.id,
      'MUTATION_ITEM_TRANSFERRED',
      'StockMutation',
      id,
      { fromUnitId: m.fromUnitId, toUnitId: m.toUnitId, qty: item.qty },
      { status: 'RECEIVED' },
    );
  });
  updateById<MutationRow>('stockMutations', id, { status: 'RECEIVED' });
  return getMutation(id);
}
