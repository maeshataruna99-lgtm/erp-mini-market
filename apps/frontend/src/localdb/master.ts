import {
  assembleProduct,
  assembleSupplier,
  assembleUnit,
  batchRowToBatch,
  findById,
  findWhere,
  insert,
  nextId,
  removeWhere,
  updateById,
} from './db';
import type {
  ProductBatchRow,
  ProductRow,
  StockLevelRow,
  SupplierRow,
  UnitRow,
} from './db';
import { buildMeta, httpError, lowerContains, normalizePagination } from './helpers';
import type { Product, ProductBatch, Supplier, Unit } from '@/types';

// ===== Unit =====
export function listUnits(params: { page?: number; limit?: number; search?: string }) {
  const { page, limit, skip } = normalizePagination(params.page, params.limit);
  const rows = findWhere<UnitRow>('units', (u) =>
    params.search ? lowerContains(u.name, params.search) : true,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = rows.length;
  const items = rows.slice(skip, skip + limit).map(assembleUnit);
  return { data: items, meta: buildMeta(page, limit, total) };
}

export function getUnit(id: string): Unit {
  const u = findById<UnitRow>('units', id);
  if (!u) throw httpError('Unit tidak ditemukan');
  return assembleUnit(u);
}

export function createUnit(body: { name: string; isCentral?: boolean; address?: string }): Unit {
  const row: UnitRow = {
    id: nextId(),
    name: body.name,
    isCentral: body.isCentral ?? false,
    address: body.address ?? null,
    createdAt: new Date().toISOString(),
  };
  insert<UnitRow>('units', row);
  return assembleUnit(row);
}

export function updateUnit(id: string, body: Partial<{ name: string; isCentral?: boolean; address?: string }>): Unit {
  getUnit(id);
  const row = updateById<UnitRow>('units', id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.isCentral !== undefined ? { isCentral: body.isCentral } : {}),
    ...(body.address !== undefined ? { address: body.address ?? null } : {}),
  });
  return assembleUnit(row!);
}

export function removeUnit(id: string): { message: string } {
  getUnit(id);
  removeWhere<UnitRow>('units', (u) => u.id === id);
  removeWhere<StockLevelRow>('stockLevels', (s) => s.unitId === id);
  return { message: 'Unit berhasil dihapus' };
}

// ===== Supplier =====
export function listSuppliers(params: { page?: number; limit?: number; search?: string }) {
  const { page, limit, skip } = normalizePagination(params.page, params.limit);
  const rows = findWhere<SupplierRow>('suppliers', (s) =>
    params.search ? lowerContains(s.name, params.search) : true,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = rows.length;
  const items = rows.slice(skip, skip + limit).map(assembleSupplier);
  return { data: items, meta: buildMeta(page, limit, total) };
}

export function getSupplier(id: string): Supplier {
  const s = findById<SupplierRow>('suppliers', id);
  if (!s) throw httpError('Supplier tidak ditemukan');
  return assembleSupplier(s);
}

export function createSupplier(body: Partial<Supplier>): Supplier {
  const row: SupplierRow = {
    id: nextId(),
    name: body.name ?? '',
    phone: body.phone ?? null,
    email: body.email ?? null,
    address: body.address ?? null,
    createdAt: new Date().toISOString(),
  };
  insert<SupplierRow>('suppliers', row);
  return assembleSupplier(row);
}

export function updateSupplier(id: string, body: Partial<Supplier>): Supplier {
  getSupplier(id);
  const row = updateById<SupplierRow>('suppliers', id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
    ...(body.email !== undefined ? { email: body.email ?? null } : {}),
    ...(body.address !== undefined ? { address: body.address ?? null } : {}),
  });
  return assembleSupplier(row!);
}

export function removeSupplier(id: string): { message: string } {
  getSupplier(id);
  removeWhere<SupplierRow>('suppliers', (s) => s.id === id);
  return { message: 'Supplier berhasil dihapus' };
}

// ===== Product =====
export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  stockStatus?: 'all' | 'low' | 'ok' | 'out';
}

export function listProducts(query: ProductQuery) {
  const { page, limit, skip } = normalizePagination(query.page, query.limit);
  let rows = findWhere<ProductRow>('products', (p) => {
    if (query.search && !lowerContains(p.name, query.search) && !lowerContains(p.sku, query.search)) return false;
    if (query.category && p.category !== query.category) return false;
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const assembled = rows.map((p) => assembleProduct(p));
  let filtered = assembled;
  if (query.stockStatus === 'low') {
    filtered = assembled.filter((p) => (p.stockLevels ?? []).some((s) => s.qty < p.minStock));
  } else if (query.stockStatus === 'ok') {
    filtered = assembled.filter((p) => (p.stockLevels ?? []).every((s) => s.qty >= p.minStock));
  } else if (query.stockStatus === 'out') {
    filtered = assembled.filter(
      (p) => !p.stockLevels || p.stockLevels.length === 0 || p.stockLevels.every((s) => s.qty === 0),
    );
  }
  const total = filtered.length;
  const items = filtered.slice(skip, skip + limit);
  return { data: items, meta: buildMeta(page, limit, total) };
}

export function listCategories(): string[] {
  const cats = findWhere<ProductRow>('products', (p) => Boolean(p.category)).map((p) => p.category as string);
  return Array.from(new Set(cats)).sort();
}

export function getProduct(id: string): Product {
  const p = findById<ProductRow>('products', id);
  if (!p) throw httpError('Produk tidak ditemukan');
  return assembleProduct(p, true, true);
}

export function createProduct(body: Partial<Product>): Product {
  const dup = findWhere<ProductRow>(
    'products',
    (p) => p.sku === body.sku || Boolean(body.barcode && p.barcode === body.barcode),
  );
  if (dup.length) throw httpError('Data sudah ada (duplikat SKU atau barcode)');
  const row: ProductRow = {
    id: nextId(),
    sku: body.sku ?? '',
    barcode: body.barcode ?? null,
    name: body.name ?? '',
    category: body.category ?? null,
    unit: body.unit ?? '',
    minStock: body.minStock ?? 0,
    costPrice: body.costPrice ?? 0,
    sellPrice: body.sellPrice ?? 0,
    isPerishable: body.isPerishable ?? false,
    createdAt: new Date().toISOString(),
  };
  insert<ProductRow>('products', row);
  return assembleProduct(row);
}

export function updateProduct(id: string, body: Partial<Product>): Product {
  getProduct(id);
  const row = updateById<ProductRow>('products', id, {
    ...(body.sku !== undefined ? { sku: body.sku } : {}),
    ...(body.barcode !== undefined ? { barcode: body.barcode ?? null } : {}),
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.category !== undefined ? { category: body.category ?? null } : {}),
    ...(body.unit !== undefined ? { unit: body.unit } : {}),
    ...(body.minStock !== undefined ? { minStock: body.minStock } : {}),
    ...(body.costPrice !== undefined ? { costPrice: body.costPrice } : {}),
    ...(body.sellPrice !== undefined ? { sellPrice: body.sellPrice } : {}),
    ...(body.isPerishable !== undefined ? { isPerishable: body.isPerishable } : {}),
  });
  return assembleProduct(row!);
}

export function removeProduct(id: string): { message: string } {
  getProduct(id);
  removeWhere<ProductRow>('products', (p) => p.id === id);
  removeWhere<StockLevelRow>('stockLevels', (s) => s.productId === id);
  removeWhere<ProductBatchRow>('productBatches', (b) => b.productId === id);
  return { message: 'Produk berhasil dihapus' };
}

export function listBatches(productId: string): ProductBatch[] {
  getProduct(productId);
  return findWhere<ProductBatchRow>('productBatches', (b) => b.productId === productId)
    .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'))
    .map(batchRowToBatch);
}

export function addBatch(productId: string, body: { unitId: string; batchNo?: string; qty: number; expiryDate?: string }): ProductBatch {
  getProduct(productId);
  const row: ProductBatchRow = {
    id: nextId(),
    productId,
    unitId: body.unitId,
    batchNo: body.batchNo ?? null,
    qty: body.qty,
    expiryDate: body.expiryDate ? new Date(body.expiryDate).toISOString() : null,
    receivedAt: new Date().toISOString(),
  };
  insert<ProductBatchRow>('productBatches', row);
  return batchRowToBatch(row);
}
