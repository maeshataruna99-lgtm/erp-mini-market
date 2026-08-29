import { insert, markSeeded, seedGuardDone } from './db';
import type {
  AuditLogRow,
  PoItemRow,
  PoRow,
  ProductBatchRow,
  ProductRow,
  StockLevelRow,
  SupplierRow,
  UnitRow,
  UserRow,
} from './db';
import { addDays, toISO } from './helpers';
import { hashPassword } from './crypto';
import { nextCode } from './sequence';

interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  isPerishable?: boolean;
}

const PRODUCTS: SeedProduct[] = [
  { sku: 'IND-GOR-001', name: 'Indomie Goreng', category: 'Makanan', unit: 'pcs', minStock: 50, costPrice: 2500, sellPrice: 3500 },
  { sku: 'MIE-SDP-002', name: 'Mie Sedaap Goreng', category: 'Makanan', unit: 'pcs', minStock: 50, costPrice: 2400, sellPrice: 3400 },
  { sku: 'BER-RAM-003', name: 'Beras Ramos 5kg', category: 'Makanan', unit: 'karung', minStock: 10, costPrice: 68000, sellPrice: 72000 },
  { sku: 'GUL-PAS-004', name: 'Gula Pasir 1kg', category: 'Sembako', unit: 'pcs', minStock: 15, costPrice: 16000, sellPrice: 18000 },
  { sku: 'BIM-OIL-005', name: 'Minyak Bimoli 2L', category: 'Sembako', unit: 'pcs', minStock: 10, costPrice: 28000, sellPrice: 32000 },
  { sku: 'TLR-AYM-008', name: 'Telur Ayam 1kg', category: 'Makanan', unit: 'kg', minStock: 10, costPrice: 24000, sellPrice: 27000, isPerishable: true },
  { sku: 'TEH-BTL-009', name: 'Teh Botol Sosro', category: 'Minuman', unit: 'pcs', minStock: 30, costPrice: 3500, sellPrice: 4500, isPerishable: true },
  { sku: 'SUS-UHT-010', name: 'Susu UHT Ultra 1L', category: 'Minuman', unit: 'pcs', minStock: 20, costPrice: 15000, sellPrice: 18000, isPerishable: true },
  { sku: 'AQU-600-011', name: 'Aqua 600ml', category: 'Minuman', unit: 'pcs', minStock: 24, costPrice: 3000, sellPrice: 4000, isPerishable: true },
  { sku: 'SAB-LIF-018', name: 'Sabun Lifebuoy', category: 'Hygiene', unit: 'pcs', minStock: 15, costPrice: 4000, sellPrice: 5500 },
];

export async function seedIfNeeded(): Promise<void> {
  if (seedGuardDone()) return;
  const passwordHash = await hashPassword('admin123');

  const units: UnitRow[] = [
    { id: 'unit-central', name: 'Gudang Pusat', isCentral: true, address: 'Jl. Raya Pusat No.1, Yogyakarta', createdAt: new Date().toISOString() },
    { id: 'unit-cabang-1', name: 'Cabang Malioboro', isCentral: false, address: 'Jl. Malioboro No.88, Yogyakarta', createdAt: new Date().toISOString() },
  ];
  units.forEach((u) => insert<UnitRow>('units', u));

  const suppliers: SupplierRow[] = [
    { id: 'sup-indofood', name: 'PT Indofood CBP', phone: '021-5551001', email: 'sales@indofood.co.id', address: 'Jakarta', createdAt: new Date().toISOString() },
    { id: 'sup-mayora', name: 'PT Mayora Indah', phone: '021-5551002', email: 'sales@mayora.co.id', address: 'Tangerang', createdAt: new Date().toISOString() },
    { id: 'sup-unilever', name: 'PT Unilever Indonesia', phone: '021-5551003', email: 'sales@unilever.co.id', address: 'Jakarta', createdAt: new Date().toISOString() },
  ];
  suppliers.forEach((s) => insert<SupplierRow>('suppliers', s));

  const users: UserRow[] = [
    { id: 'u-admin', name: 'Admin Utama', email: 'admin@minierp.id', passwordHash, role: 'ADMIN', unitId: 'unit-central', createdAt: new Date().toISOString() },
    { id: 'u-manager', name: 'Manager Operasional', email: 'manager@minierp.id', passwordHash, role: 'MANAGER', unitId: 'unit-central', createdAt: new Date().toISOString() },
    { id: 'u-gudang', name: 'Staff Gudang', email: 'gudang@minierp.id', passwordHash, role: 'STAFF_GUDANG', unitId: 'unit-central', createdAt: new Date().toISOString() },
    { id: 'u-kasir', name: 'Kasir Pusat', email: 'kasir@minierp.id', passwordHash, role: 'STAFF_KASIR', unitId: 'unit-central', createdAt: new Date().toISOString() },
    { id: 'u-kasircabang', name: 'Kasir Cabang', email: 'kasircabang@minierp.id', passwordHash, role: 'STAFF_KASIR', unitId: 'unit-cabang-1', createdAt: new Date().toISOString() },
  ];
  users.forEach((u) => insert<UserRow>('users', u));

  let idx = 0;
  for (const p of PRODUCTS) {
    idx += 1;
    insert<ProductRow>('products', {
      id: `p-${idx}`,
      sku: p.sku,
      barcode: null,
      name: p.name,
      category: p.category,
      unit: p.unit,
      minStock: p.minStock,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      isPerishable: p.isPerishable ?? false,
      createdAt: new Date().toISOString(),
    });
  }

  const stockInit: [number, number][] = [
    [1, 120], [2, 90], [3, 8], [4, 60], [5, 14],
    [6, 6], [7, 40], [8, 12], [9, 30], [10, 5],
  ];
  for (const [pidx, qty] of stockInit) {
    insert<StockLevelRow>('stockLevels', { id: `sl-central-${pidx}`, productId: `p-${pidx}`, unitId: 'unit-central', qty });
    insert<StockLevelRow>('stockLevels', { id: `sl-cabang-${pidx}`, productId: `p-${pidx}`, unitId: 'unit-cabang-1', qty: Math.max(0, qty - 4) });
  }

  insert<ProductBatchRow>('productBatches', {
    id: 'b-1', productId: 'p-6', unitId: 'unit-central', batchNo: 'TLR-001', qty: 6,
    expiryDate: toISO(addDays(new Date(), 20)), receivedAt: new Date().toISOString(),
  });
  insert<ProductBatchRow>('productBatches', {
    id: 'b-2', productId: 'p-7', unitId: 'unit-central', batchNo: 'TEH-001', qty: 40,
    expiryDate: toISO(addDays(new Date(), 60)), receivedAt: new Date().toISOString(),
  });

  const po: PoRow = {
    id: 'po-1', poNumber: nextCode('PO'), supplierId: 'sup-indofood', status: 'DRAFT',
    createdById: 'u-admin', approvedById: null, sentAt: null, notes: 'PO contoh',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  insert<PoRow>('purchaseOrders', po);
  const poItems: PoItemRow[] = [
    { id: 'poi-1', poId: 'po-1', productId: 'p-1', qtyOrder: 100, price: 2500 },
    { id: 'poi-2', poId: 'po-1', productId: 'p-4', qtyOrder: 40, price: 16000 },
  ];
  poItems.forEach((i) => insert<PoItemRow>('poItems', i));

  const now = new Date().toISOString();
  const audit: AuditLogRow[] = [
    { id: 'al-1', userId: 'u-admin', action: 'SEED_INIT', entity: 'System', entityId: 'system', before: null, after: { version: '1' }, createdAt: now },
    { id: 'al-2', userId: 'u-admin', action: 'PO_CREATED', entity: 'PurchaseOrder', entityId: 'po-1', before: null, after: { poNumber: 'PO-2026-0001' }, createdAt: now },
  ];
  audit.forEach((a) => insert<AuditLogRow>('auditLogs', a));

  markSeeded();
}
