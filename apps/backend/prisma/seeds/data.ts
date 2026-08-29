import { PrismaClient } from '@prisma/client';

export interface BatchLedger {
  id: string;
  productId: string;
  unitId: string;
  qty: number;
  expiryDate: Date | null;
}

export interface StockLedger {
  productId: string;
  unitId: string;
  qty: number;
  batches: BatchLedger[];
}

export interface Registry {
  prisma: PrismaClient;
  users: Record<string, string>;
  products: Record<string, string>;
  stock: Map<string, StockLedger>;
}

export function createRegistry(prisma: PrismaClient): Registry {
  return { prisma, users: {}, products: {}, stock: new Map() };
}

const key = (productId: string, unitId: string) => `${productId}|${unitId}`;

export function getStock(r: Registry, productId: string, unitId: string): StockLedger {
  const k = key(productId, unitId);
  let s = r.stock.get(k);
  if (!s) {
    s = { productId, unitId, qty: 0, batches: [] };
    r.stock.set(k, s);
  }
  return s;
}

export function setStockQty(r: Registry, productId: string, unitId: string, qty: number): void {
  getStock(r, productId, unitId).qty = qty;
}

export function addStockQty(r: Registry, productId: string, unitId: string, delta: number): void {
  const s = getStock(r, productId, unitId);
  s.qty += delta;
}

export function setBatch(
  r: Registry,
  productId: string,
  unitId: string,
  batchId: string,
  qty: number,
  expiryDate: Date | null = null,
): void {
  const s = getStock(r, productId, unitId);
  const existing = s.batches.find((b) => b.id === batchId);
  if (existing) {
    existing.qty = qty;
    existing.expiryDate = expiryDate;
  } else {
    s.batches.push({ id: batchId, productId, unitId, qty, expiryDate });
  }
}

export function reduceBatchFEFO(
  r: Registry,
  productId: string,
  unitId: string,
  total: number,
): void {
  const s = getStock(r, productId, unitId);
  const sorted = [...s.batches].sort(
    (a, b) => (a.expiryDate?.getTime() ?? Infinity) - (b.expiryDate?.getTime() ?? Infinity),
  );
  let remaining = total;
  for (const b of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(b.qty, remaining);
    b.qty -= take;
    remaining -= take;
  }
}

export function sourceExpiryFEFO(
  r: Registry,
  productId: string,
  unitId: string,
): Date | null {
  const s = getStock(r, productId, unitId);
  const earliest = [...s.batches]
    .filter((b) => b.qty > 0)
    .sort(
      (a, b) => (a.expiryDate?.getTime() ?? Infinity) - (b.expiryDate?.getTime() ?? Infinity),
    )[0];
  return earliest?.expiryDate ?? null;
}

export function addToBatch(
  r: Registry,
  productId: string,
  unitId: string,
  qty: number,
  expiryDate: Date | null = null,
): void {
  const s = getStock(r, productId, unitId);
  const existing = s.batches.find(
    (b) => b.expiryDate?.getTime() === expiryDate?.getTime(),
  );
  if (existing) {
    existing.qty += qty;
  } else {
    const n = s.batches.length + 1;
    s.batches.push({
      id: `batch-${productId}-${unitId}-${n}`,
      productId,
      unitId,
      qty,
      expiryDate,
    });
  }
}
