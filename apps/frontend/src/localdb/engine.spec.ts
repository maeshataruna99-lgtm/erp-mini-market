import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Engine from './index';
import type { GoodsReceiving, OpnameSession, PurchaseOrder, StockMutation } from '@/types';

type Engine = typeof Engine;
let engine: Engine;

async function loginAs(email: string, password = 'admin123'): Promise<{ user: { id: string; role: string; email: string } }> {
  const res = await engine.post<{ user: { id: string; role: string; email: string } }>('/auth/login', { email, password });
  localStorage.setItem('minierp_user', JSON.stringify(res.user));
  return res;
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  engine = await import('./index');
});

describe('localdb engine', () => {
  it('auto-seeds and logs in a demo admin', async () => {
    const res = await loginAs('admin@minierp.id');
    expect(res.user.role).toBe('ADMIN');
    expect(res.user.email).toBe('admin@minierp.id');
  });

  it('rejects a wrong password', async () => {
    await expect(loginAs('admin@minierp.id', 'wrongpass')).rejects.toThrow('Email atau password salah');
  });

  it('seeds products and units', async () => {
    await loginAs('admin@minierp.id');
    const products = await engine.paginated<{ id: string }>('/products', { params: { limit: 100 } });
    const units = await engine.paginated<{ id: string }>('/units', { params: { limit: 100 } });
    expect(products.data.length).toBeGreaterThanOrEqual(10);
    expect(units.data.length).toBeGreaterThanOrEqual(2);
  });

  it('runs the full PO lifecycle', async () => {
    await loginAs('admin@minierp.id');
    const po = await engine.post<PurchaseOrder>('/po', {
      supplierId: 'sup-indofood',
      items: [{ productId: 'p-1', qtyOrder: 10, price: 2500 }],
    });
    expect(po.poNumber).toMatch(/^PO-/);
    expect(po.status).toBe('DRAFT');

    const submitted = await engine.patch<PurchaseOrder>(`/po/${po.id}/submit`);
    expect(submitted.status).toBe('PENDING_APPROVAL');

    const approved = await engine.patch<PurchaseOrder>(`/po/${po.id}/approve`);
    expect(approved.status).toBe('APPROVED');

    const sent = await engine.patch<PurchaseOrder>(`/po/${po.id}/send`);
    expect(sent.status).toBe('SENT');
  });

  it('increments PO sequence numbers', async () => {
    await loginAs('admin@minierp.id');
    const a = await engine.post<PurchaseOrder>('/po', { supplierId: 'sup-indofood', items: [{ productId: 'p-1', qtyOrder: 1, price: 1 }] });
    const b = await engine.post<PurchaseOrder>('/po', { supplierId: 'sup-indofood', items: [{ productId: 'p-1', qtyOrder: 1, price: 1 }] });
    const seqA = Number(a.poNumber.split('-').pop());
    const seqB = Number(b.poNumber.split('-').pop());
    expect(seqB).toBe(seqA + 1);
  });

  it('receiving confirm increments stock and completes the PO', async () => {
    await loginAs('admin@minierp.id');
    const po = await engine.post<PurchaseOrder>('/po', {
      supplierId: 'sup-indofood',
      items: [{ productId: 'p-1', qtyOrder: 10, price: 2500 }],
    });
    await engine.patch<PurchaseOrder>(`/po/${po.id}/submit`);
    await engine.patch<PurchaseOrder>(`/po/${po.id}/approve`);
    await engine.patch<PurchaseOrder>(`/po/${po.id}/send`);

    const before = await stockOf('p-1', 'unit-central');
    const receiving = await engine.post<GoodsReceiving>('/receiving', { poId: po.id, unitId: 'unit-central' });
    const confirmed = await engine.post<GoodsReceiving>(`/receiving/${receiving.id}/confirm`, {
      items: [{ id: receiving.items![0].id, qtyReceived: 10 }],
    });
    expect(confirmed.status).toBe('COMPLETED');

    const after = await stockOf('p-1', 'unit-central');
    expect(after).toBe(before + 10);

    const poAfter = await engine.get<PurchaseOrder>(`/po/${po.id}`);
    expect(poAfter.status).toBe('COMPLETED');
  });

  it('flags discrepancy above 5%', async () => {
    await loginAs('admin@minierp.id');
    const po = await engine.post<PurchaseOrder>('/po', {
      supplierId: 'sup-indofood',
      items: [{ productId: 'p-1', qtyOrder: 100, price: 2500 }],
    });
    await engine.patch<PurchaseOrder>(`/po/${po.id}/submit`);
    await engine.patch<PurchaseOrder>(`/po/${po.id}/approve`);
    await engine.patch<PurchaseOrder>(`/po/${po.id}/send`);
    const receiving = await engine.post<GoodsReceiving>('/receiving', { poId: po.id, unitId: 'unit-central' });
    const confirmed = await engine.post<GoodsReceiving>(`/receiving/${receiving.id}/confirm`, {
      items: [{ id: receiving.items![0].id, qtyReceived: 60 }],
    });
    expect(confirmed.hasDiscrepancy).toBe(true);
    expect(confirmed.items![0].discrepancyPct).toBeCloseTo(40, 1);
  });

  it('opname reconcile adjusts stock to physical count', async () => {
    await loginAs('admin@minierp.id');
    const before = await stockOf('p-1', 'unit-central');
    const session = await engine.post<OpnameSession>('/opname/sessions', { unitId: 'unit-central' });
    await engine.post<OpnameSession>(`/opname/sessions/${session.id}/start`);
    await engine.post<OpnameSession>(`/opname/sessions/${session.id}/blind-count`, {
      items: [{ productId: 'p-1', qtyPhysical: before + 5 }],
    });
    const reconciled = await engine.post<OpnameSession>(`/opname/sessions/${session.id}/reconcile`);
    expect(reconciled.status).toBe('RECONCILED');
    expect(await stockOf('p-1', 'unit-central')).toBe(before + 5);
  });

  it('mutation receive moves stock between units', async () => {
    await loginAs('admin@minierp.id');
    const beforeFrom = await stockOf('p-1', 'unit-central');
    const beforeTo = await stockOf('p-1', 'unit-cabang-1');

    const mutation = await engine.post<StockMutation>('/mutations', {
      fromUnitId: 'unit-central',
      toUnitId: 'unit-cabang-1',
      items: [{ productId: 'p-1', qty: 4 }],
    });
    await engine.patch<StockMutation>(`/mutations/${mutation.id}/approve`);
    await engine.patch<StockMutation>(`/mutations/${mutation.id}/pick`);
    const received = await engine.patch<StockMutation>(`/mutations/${mutation.id}/receive`);
    expect(received.status).toBe('RECEIVED');

    expect(await stockOf('p-1', 'unit-central')).toBe(beforeFrom - 4);
    expect(await stockOf('p-1', 'unit-cabang-1')).toBe(beforeTo + 4);
  });

  it('rejects mutation when source stock is insufficient', async () => {
    await loginAs('admin@minierp.id');
    const mutation = await engine.post<StockMutation>('/mutations', {
      fromUnitId: 'unit-central',
      toUnitId: 'unit-cabang-1',
      items: [{ productId: 'p-1', qty: 999999 }],
    });
    await engine.patch<StockMutation>(`/mutations/${mutation.id}/approve`);
    await engine.patch<StockMutation>(`/mutations/${mutation.id}/pick`);
    await expect(engine.patch<StockMutation>(`/mutations/${mutation.id}/receive`)).rejects.toThrow('Stok tidak cukup');
  });

  it('enforces RBAC: kasir cannot approve a PO', async () => {
    await loginAs('admin@minierp.id');
    const po = await engine.post<PurchaseOrder>('/po', { supplierId: 'sup-indofood', items: [{ productId: 'p-1', qtyOrder: 1, price: 1 }] });
    await engine.patch<PurchaseOrder>(`/po/${po.id}/submit`);

    const kasir = await loginAs('kasir@minierp.id');
    expect(kasir.user.role).toBe('STAFF_KASIR');
    await expect(engine.patch<PurchaseOrder>(`/po/${po.id}/approve`)).rejects.toThrow('tidak memiliki akses');
  });

  it('enforces RBAC: non-ADMIN cannot create users', async () => {
    await loginAs('kasir@minierp.id');
    await expect(
      engine.post<{ id: string }>('/auth/users', { name: 'X', email: 'x@minierp.id', password: '123456', role: 'STAFF_KASIR' }),
    ).rejects.toThrow('tidak memiliki akses');
  });

  it('blocks creating a duplicate email user', async () => {
    await loginAs('admin@minierp.id');
    await expect(
      engine.post<{ id: string }>('/auth/users', { name: 'X', email: 'admin@minierp.id', password: '123456', role: 'STAFF_KASIR' }),
    ).rejects.toThrow('Email sudah terdaftar');
  });

  async function stockOf(productId: string, unitId: string): Promise<number> {
    const product = await engine.get<{ stockLevels?: { unitId: string; qty: number }[] }>(`/products/${productId}`);
    return product.stockLevels?.find((s) => s.unitId === unitId)?.qty ?? 0;
  }
});
