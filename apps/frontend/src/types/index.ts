export type Role = 'ADMIN' | 'MANAGER' | 'STAFF_GUDANG' | 'STAFF_KASIR';

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  unitId: string | null;
  unitName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Paginated<T> {
  data: T[];
  meta: ApiMeta;
}

export interface Unit {
  id: string;
  name: string;
  isCentral: boolean;
  address?: string | null;
  _count?: { users: number; stockLevels: number };
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  _count?: { purchaseOrders: number };
}

export interface StockLevel {
  id: string;
  productId: string;
  unitId: string;
  qty: number;
  unit?: Unit;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category?: string | null;
  unit: string;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  isPerishable: boolean;
  stockLevels?: StockLevel[];
  batches?: ProductBatch[];
}

export interface ProductBatch {
  id: string;
  productId: string;
  unitId: string;
  batchNo?: string | null;
  qty: number;
  expiryDate?: string | null;
  receivedAt: string;
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>;
}

export interface PoItem {
  id: string;
  productId: string;
  qtyOrder: number;
  price: number;
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>;
}

export type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  status: POStatus;
  createdById: string;
  createdBy?: { id: string; name: string };
  approvedById?: string | null;
  sentAt?: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: { items: number };
  items?: PoItem[];
}

export type ReceivingStatus = 'DRAFT' | 'PARTIAL' | 'COMPLETED';

export interface GoodsReceiving {
  id: string;
  poId: string;
  po?: { id: string; poNumber: string; supplier?: { name: string } };
  receivedById: string;
  receivedBy?: { name: string };
  unitId: string;
  status: ReceivingStatus;
  hasDiscrepancy: boolean;
  createdAt: string;
  items?: ReceivingItem[];
}

export interface ReceivingItem {
  id: string;
  receivingId: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>;
  qtyOrdered: number;
  qtyReceived: number;
  discrepancyPct: number;
}

export type OpnameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'RECONCILED' | 'CLOSED';

export interface OpnameSession {
  id: string;
  unitId: string;
  scope?: string | null;
  status: OpnameStatus;
  scheduledAt: string;
  createdById: string;
  createdAt: string;
  _count?: { items: number };
  items?: OpnameItem[];
}

export interface OpnameItem {
  id: string;
  sessionId: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>;
  qtySystem: number;
  qtyPhysical: number;
  variance: number;
  reason?: string | null;
}

export type MutationStatus = 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';

export interface StockMutation {
  id: string;
  mutationNumber: string;
  fromUnitId: string;
  fromUnit?: { id: string; name: string };
  toUnitId: string;
  toUnit?: { id: string; name: string };
  status: MutationStatus;
  requestedById: string;
  requestedBy?: { name: string };
  approvedById?: string | null;
  createdAt: string;
  _count?: { items: number };
  items?: MutationItem[];
}

export interface MutationItem {
  id: string;
  mutationId: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>;
  qty: number;
}

export interface DashboardSummary {
  inventoryQty: number;
  lowStock: number;
  pendingPo: number;
  receivingsToday: number;
  expiringSoon: number;
  productCount: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
  user?: { name: string; email: string };
}
