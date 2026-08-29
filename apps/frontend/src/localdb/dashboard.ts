import {
  assembleAuditLog,
  batchRowToBatch,
  findWhere,
} from './db';
import type {
  AuditLogRow,
  MutationRow,
  PoRow,
  ProductBatchRow,
  ProductRow,
  ReceivingRow,
  StockLevelRow,
} from './db';
import { addDays, toDateKey } from './helpers';
import type { AuditLog, DashboardSummary, Product, ProductBatch } from '@/types';

function fetchLowStockProducts(unitId?: string): Product[] {
  const products = findWhere<ProductRow>('products', () => true);
  const stockLevels = findWhere<StockLevelRow>('stockLevels', (s) => (unitId ? s.unitId === unitId : true));
  return products
    .filter((p) => stockLevels.filter((s) => s.productId === p.id).some((s) => s.qty < p.minStock))
    .map((p) => {
      const unit = unitId
        ? findWhere<StockLevelRow>('stockLevels', (s) => s.productId === p.id && s.unitId === unitId)
        : stockLevels.filter((s) => s.productId === p.id);
      const product: Product = {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        unit: p.unit,
        minStock: p.minStock,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        isPerishable: p.isPerishable,
        stockLevels: unit.map((s) => ({ id: s.id, productId: s.productId, unitId: s.unitId, qty: s.qty })),
      };
      return product;
    });
}

export function summary(): DashboardSummary {
  const lowStock = fetchLowStockProducts().length;
  const pendingPo = findWhere<PoRow>('purchaseOrders', (p) => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').length;
  const receivingsToday = findWhere<ReceivingRow>('goodsReceivings', (r) => {
    return new Date(r.createdAt).getTime() >= addDays(new Date(), -1).getTime();
  }).length;
  const now = Date.now();
  const expiringSoon = findWhere<ProductBatchRow>('productBatches', (b) => {
    if (!b.expiryDate) return false;
    const t = new Date(b.expiryDate).getTime();
    return t >= now && t <= addDays(new Date(), 30).getTime();
  }).length;
  const productCount = findWhere<ProductRow>('products', () => true).length;
  const inventoryQty = findWhere<StockLevelRow>('stockLevels', () => true).reduce((sum, s) => sum + s.qty, 0);
  return { inventoryQty, lowStock, pendingPo, receivingsToday, expiringSoon, productCount };
}

export function lowStock(unitId?: string, limit = 20): Product[] {
  return fetchLowStockProducts(unitId).slice(0, limit);
}

export function expiry(unitId?: string, limit = 20): ProductBatch[] {
  const now = Date.now();
  const upper = addDays(new Date(), 30).getTime();
  const rows = findWhere<ProductBatchRow>('productBatches', (b) => {
    if (!b.expiryDate) return false;
    if (unitId && b.unitId !== unitId) return false;
    const t = new Date(b.expiryDate).getTime();
    return t >= now && t <= upper;
  }).sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
  return rows.slice(0, limit).map(batchRowToBatch);
}

export function weeklyTrend(days = 7): { labels: string[]; values: number[] } {
  const sinceStart = new Date();
  sinceStart.setHours(0, 0, 0, 0);
  sinceStart.setDate(sinceStart.getDate() - (days - 1));

  const receivings = findWhere<ReceivingRow>('goodsReceivings', (r) => new Date(r.createdAt).getTime() >= sinceStart.getTime());
  const mutations = findWhere<MutationRow>('stockMutations', (m) => new Date(m.createdAt).getTime() >= sinceStart.getTime());

  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(sinceStart);
    day.setDate(sinceStart.getDate() + i);
    const dayKey = toDateKey(day);
    labels.push(day.toLocaleDateString('id-ID', { weekday: 'short' }));
    const rcv = receivings.filter((r) => toDateKey(r.createdAt) === dayKey).length;
    const mut = mutations.filter((m) => toDateKey(m.createdAt) === dayKey).length;
    values.push(rcv + mut);
  }
  return { labels, values };
}

export function auditLogs(limit = 20): AuditLog[] {
  return findWhere<AuditLogRow>('auditLogs', () => true)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(assembleAuditLog);
}
