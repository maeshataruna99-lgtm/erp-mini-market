import { newId } from './helpers';
import type {
  AuditLog,
  GoodsReceiving,
  MutationItem,
  OpnameItem,
  OpnameSession,
  PoItem,
  Product,
  ProductBatch,
  PurchaseOrder,
  ReceivingItem,
  StockLevel,
  StockMutation,
  Supplier,
  Unit,
  User,
} from '@/types';

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF_GUDANG' | 'STAFF_KASIR';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  unitId: string | null;
  createdAt: string;
}

export interface RefreshTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface UnitRow {
  id: string;
  name: string;
  isCentral: boolean;
  address: string | null;
  createdAt: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
}

export interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  unit: string;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  isPerishable: boolean;
  createdAt: string;
}

export interface ProductBatchRow {
  id: string;
  productId: string;
  unitId: string;
  batchNo: string | null;
  qty: number;
  expiryDate: string | null;
  receivedAt: string;
}

export interface StockLevelRow {
  id: string;
  productId: string;
  unitId: string;
  qty: number;
}

export interface PoRow {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrder['status'];
  createdById: string;
  approvedById: string | null;
  sentAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoItemRow {
  id: string;
  poId: string;
  productId: string;
  qtyOrder: number;
  price: number;
}

export interface ReceivingRow {
  id: string;
  poId: string;
  receivedById: string;
  unitId: string;
  status: GoodsReceiving['status'];
  hasDiscrepancy: boolean;
  createdAt: string;
}

export interface ReceivingItemRow {
  id: string;
  receivingId: string;
  productId: string;
  qtyOrdered: number;
  qtyReceived: number;
  discrepancyPct: number;
}

export interface OpnameSessionRow {
  id: string;
  unitId: string;
  scope: string | null;
  status: OpnameSession['status'];
  scheduledAt: string;
  createdById: string;
  createdAt: string;
}

export interface OpnameItemRow {
  id: string;
  sessionId: string;
  productId: string;
  qtySystem: number;
  qtyPhysical: number;
  variance: number;
  reason: string | null;
  countedById: string;
}

export interface MutationRow {
  id: string;
  mutationNumber: string;
  fromUnitId: string;
  toUnitId: string;
  status: StockMutation['status'];
  requestedById: string;
  approvedById: string | null;
  createdAt: string;
}

export interface MutationItemRow {
  id: string;
  mutationId: string;
  productId: string;
  qty: number;
}

export interface AuditLogRow {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface DB {
  users: UserRow[];
  refreshTokens: RefreshTokenRow[];
  units: UnitRow[];
  suppliers: SupplierRow[];
  products: ProductRow[];
  productBatches: ProductBatchRow[];
  stockLevels: StockLevelRow[];
  purchaseOrders: PoRow[];
  poItems: PoItemRow[];
  goodsReceivings: ReceivingRow[];
  receivingItems: ReceivingItemRow[];
  opnameSessions: OpnameSessionRow[];
  opnameItems: OpnameItemRow[];
  stockMutations: MutationRow[];
  mutationItems: MutationItemRow[];
  auditLogs: AuditLogRow[];
}

export type TableName = keyof DB;

const NS = 'minierp_localdb';
const VERSION = '1';

export function tables(): Record<TableName, unknown[]> {
  return {
    users: [],
    refreshTokens: [],
    units: [],
    suppliers: [],
    products: [],
    productBatches: [],
    stockLevels: [],
    purchaseOrders: [],
    poItems: [],
    goodsReceivings: [],
    receivingItems: [],
    opnameSessions: [],
    opnameItems: [],
    stockMutations: [],
    mutationItems: [],
    auditLogs: [],
  };
}

let cache: DB | null = null;

export function db(): DB {
  if (cache) return cache;
  const raw = localStorage.getItem(NS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.users && parsed.units) {
        cache = { ...tables(), ...parsed } as unknown as DB;
        return cache;
      }
    } catch {
      /* fallthrough to fresh */
    }
  }
  cache = { ...tables() } as unknown as DB;
  return cache;
}

export function persist(): void {
  if (!cache) return;
  localStorage.setItem(NS, JSON.stringify({ ...cache, __v: VERSION }));
}

export function resetDB(): void {
  cache = { ...tables() } as unknown as DB;
  persist();
}

export function seedGuardDone(): boolean {
  return Boolean(localStorage.getItem('minierp_localdb_seeded'));
}

export function markSeeded(): void {
  localStorage.setItem('minierp_localdb_seeded', '1');
}

export function insert<T>(table: TableName, row: T): T {
  (db()[table] as unknown as T[]).push(row);
  persist();
  return row;
}

export function findAll<T>(table: TableName): T[] {
  return (db()[table] as unknown as T[]) ?? [];
}

export function findById<T extends { id: string }>(table: TableName, id: string): T | undefined {
  return findAll<T>(table).find((r) => r.id === id);
}

export function findWhere<T>(table: TableName, pred: (row: T) => boolean): T[] {
  return findAll<T>(table).filter(pred);
}

export function findOne<T>(table: TableName, pred: (row: T) => boolean): T | undefined {
  return findAll<T>(table).find(pred);
}

export function updateById<T extends { id: string }>(table: TableName, id: string, patch: Partial<T>): T | undefined {
  const rows = findAll<T>(table);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  rows[idx] = { ...rows[idx], ...patch };
  (db()[table] as unknown as T[]) = rows;
  persist();
  return rows[idx];
}

export function removeWhere<T>(table: TableName, pred: (row: T) => boolean): void {
  const rows = findAll<T>(table).filter((r) => !pred(r));
  (db()[table] as unknown as T[]) = rows;
  persist();
}

export function nextId(): string {
  return newId();
}

// ===== Assembl-ers (denormalized reads the views rely on) =====

export function sanitizeUser(u: UserRow): User {
  const unit = u.unitId ? findById<UnitRow>('units', u.unitId) : undefined;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    unitId: u.unitId,
    unitName: unit?.name,
  };
}

export function assembleProduct(p: ProductRow, includeStock = true, includeBatches = false): Product {
  const out: Product = {
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
  };
  if (includeStock) {
    out.stockLevels = findWhere<StockLevelRow>('stockLevels', (s) => s.productId === p.id).map((s) => {
      const unit = findById<UnitRow>('units', s.unitId);
      return { id: s.id, productId: s.productId, unitId: s.unitId, qty: s.qty, ...(unit ? { unit: unitRowToUnit(unit) } : {}) } as StockLevel;
    });
  }
  if (includeBatches) {
    out.batches = findWhere<ProductBatchRow>('productBatches', (b) => b.productId === p.id)
      .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'))
      .map(batchRowToBatch);
  }
  return out;
}

function unitRowToUnit(u: UnitRow): Unit {
  return {
    id: u.id,
    name: u.name,
    isCentral: u.isCentral,
    address: u.address,
    _count: {
      users: findWhere<UserRow>('users', (x) => x.unitId === u.id).length,
      stockLevels: findWhere<StockLevelRow>('stockLevels', (x) => x.unitId === u.id).length,
    },
  };
}

function supplierRowToSupplier(s: SupplierRow): Supplier {
  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    address: s.address,
    _count: { purchaseOrders: findWhere<PoRow>('purchaseOrders', (p) => p.supplierId === s.id).length },
  };
}

function productPick(p: ProductRow): Pick<Product, 'id' | 'name' | 'sku' | 'unit'> {
  return { id: p.id, name: p.name, sku: p.sku, unit: p.unit };
}

export function batchRowToBatch(b: ProductBatchRow): ProductBatch {
  const product = findById<ProductRow>('products', b.productId);
  return {
    id: b.id,
    productId: b.productId,
    unitId: b.unitId,
    batchNo: b.batchNo,
    qty: b.qty,
    expiryDate: b.expiryDate,
    receivedAt: b.receivedAt,
    ...(product ? { product: productPick(product) } : {}),
  };
}

export function assembleUnit(u: UnitRow): Unit {
  return unitRowToUnit(u);
}

export function assembleSupplier(s: SupplierRow): Supplier {
  return supplierRowToSupplier(s);
}

export function assemblePo(p: PoRow, withItems = false): PurchaseOrder {
  const supplier = findById<SupplierRow>('suppliers', p.supplierId);
  const createdBy = findById<UserRow>('users', p.createdById);
  const out: PurchaseOrder = {
    id: p.id,
    poNumber: p.poNumber,
    supplierId: p.supplierId,
    ...(supplier ? { supplier: { id: supplier.id, name: supplier.name } } : {}),
    status: p.status,
    createdById: p.createdById,
    ...(createdBy ? { createdBy: { id: createdBy.id, name: createdBy.name } } : {}),
    approvedById: p.approvedById,
    sentAt: p.sentAt,
    notes: p.notes,
    createdAt: p.createdAt,
    _count: { items: findWhere<PoItemRow>('poItems', (i) => i.poId === p.id).length },
  };
  if (withItems) {
    out.items = findWhere<PoItemRow>('poItems', (i) => i.poId === p.id).map((i) => {
      const product = findById<ProductRow>('products', i.productId);
      const item: PoItem = { id: i.id, productId: i.productId, qtyOrder: i.qtyOrder, price: i.price };
      if (product) item.product = productPick(product);
      return item;
    });
  }
  return out;
}

export function assembleReceiving(r: ReceivingRow, withItems = false): GoodsReceiving {
  const po = findById<PoRow>('purchaseOrders', r.poId);
  const receivedBy = findById<UserRow>('users', r.receivedById);
  const out: GoodsReceiving = {
    id: r.id,
    poId: r.poId,
    ...(po
      ? {
          po: {
            id: po.id,
            poNumber: po.poNumber,
            ...(po.supplierId
              ? { supplier: { name: findById<SupplierRow>('suppliers', po.supplierId)?.name ?? '' } }
              : {}),
          },
        }
      : {}),
    receivedById: r.receivedById,
    ...(receivedBy ? { receivedBy: { name: receivedBy.name } } : {}),
    unitId: r.unitId,
    status: r.status,
    hasDiscrepancy: r.hasDiscrepancy,
    createdAt: r.createdAt,
  };
  if (withItems) {
    out.items = findWhere<ReceivingItemRow>('receivingItems', (i) => i.receivingId === r.id).map((i) => {
      const product = findById<ProductRow>('products', i.productId);
      const item: ReceivingItem = {
        id: i.id,
        receivingId: i.receivingId,
        productId: i.productId,
        qtyOrdered: i.qtyOrdered,
        qtyReceived: i.qtyReceived,
        discrepancyPct: i.discrepancyPct,
      };
      if (product) item.product = productPick(product);
      return item;
    });
  }
  return out;
}

export function assembleOpname(s: OpnameSessionRow, withItems = false): OpnameSession {
  const out: OpnameSession = {
    id: s.id,
    unitId: s.unitId,
    scope: s.scope,
    status: s.status,
    scheduledAt: s.scheduledAt,
    createdById: s.createdById,
    createdAt: s.createdAt,
    _count: { items: findWhere<OpnameItemRow>('opnameItems', (i) => i.sessionId === s.id).length },
  };
  if (withItems) {
    out.items = findWhere<OpnameItemRow>('opnameItems', (i) => i.sessionId === s.id).map((i) => {
      const product = findById<ProductRow>('products', i.productId);
      const item: OpnameItem = {
        id: i.id,
        sessionId: i.sessionId,
        productId: i.productId,
        qtySystem: i.qtySystem,
        qtyPhysical: i.qtyPhysical,
        variance: i.variance,
        reason: i.reason,
      };
      if (product) item.product = productPick(product);
      return item;
    });
  }
  return out;
}

export function assembleMutation(m: MutationRow, withItems = false): StockMutation {
  const fromUnit = findById<UnitRow>('units', m.fromUnitId);
  const toUnit = findById<UnitRow>('units', m.toUnitId);
  const requestedBy = findById<UserRow>('users', m.requestedById);
  const out: StockMutation = {
    id: m.id,
    mutationNumber: m.mutationNumber,
    fromUnitId: m.fromUnitId,
    ...(fromUnit ? { fromUnit: { id: fromUnit.id, name: fromUnit.name } } : {}),
    toUnitId: m.toUnitId,
    ...(toUnit ? { toUnit: { id: toUnit.id, name: toUnit.name } } : {}),
    status: m.status,
    requestedById: m.requestedById,
    ...(requestedBy ? { requestedBy: { name: requestedBy.name } } : {}),
    approvedById: m.approvedById,
    createdAt: m.createdAt,
    _count: { items: findWhere<MutationItemRow>('mutationItems', (i) => i.mutationId === m.id).length },
  };
  if (withItems) {
    out.items = findWhere<MutationItemRow>('mutationItems', (i) => i.mutationId === m.id).map((i) => {
      const product = findById<ProductRow>('products', i.productId);
      const item: MutationItem = { id: i.id, mutationId: i.mutationId, productId: i.productId, qty: i.qty };
      if (product) item.product = productPick(product);
      return item;
    });
  }
  return out;
}

export function assembleAuditLog(a: AuditLogRow): AuditLog {
  const user = findById<UserRow>('users', a.userId);
  return {
    id: a.id,
    userId: a.userId,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    before: a.before,
    after: a.after,
    createdAt: a.createdAt,
    ...(user ? { user: { name: user.name, email: user.email } } : {}),
  };
}

export function addAuditLog(userId: string, action: string, entity: string, entityId: string, before?: unknown, after?: unknown): void {
  insert<AuditLogRow>('auditLogs', {
    id: nextId(),
    userId,
    action,
    entity,
    entityId,
    before: before === undefined ? null : JSON.parse(JSON.stringify(before)),
    after: after === undefined ? null : JSON.parse(JSON.stringify(after)),
    createdAt: new Date().toISOString(),
  });
}

export function upsertStock(productId: string, unitId: string, delta: number): StockLevelRow {
  const existing = findOne<StockLevelRow>('stockLevels', (s) => s.productId === productId && s.unitId === unitId);
  if (existing) {
    updateById<StockLevelRow>('stockLevels', existing.id, { qty: existing.qty + delta });
    return { ...existing, qty: existing.qty + delta };
  }
  const row: StockLevelRow = { id: nextId(), productId, unitId, qty: delta };
  insert<StockLevelRow>('stockLevels', row);
  return row;
}

export function setStock(productId: string, unitId: string, qty: number): StockLevelRow {
  const existing = findOne<StockLevelRow>('stockLevels', (s) => s.productId === productId && s.unitId === unitId);
  if (existing) {
    updateById<StockLevelRow>('stockLevels', existing.id, { qty });
    return { ...existing, qty };
  }
  const row: StockLevelRow = { id: nextId(), productId, unitId, qty };
  insert<StockLevelRow>('stockLevels', row);
  return row;
}
