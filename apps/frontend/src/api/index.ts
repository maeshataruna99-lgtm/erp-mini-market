import { get, patch, post, remove } from './http';
import type {
  AuditLog,
  AuthResponse,
  DashboardSummary,
  GoodsReceiving,
  MutationStatus,
  OpnameSession,
  OpnameStatus,
  Paginated,
  POStatus,
  Product,
  ProductBatch,
  PurchaseOrder,
  StockMutation,
  Supplier,
  Unit,
  User,
} from '@/types';

// ===== Auth =====
export const authApi = {
  login: (email: string, password: string) =>
    post<AuthResponse>('/auth/login', { email, password }),
  refresh: (refreshToken: string) => post<AuthResponse>('/auth/refresh', { refreshToken }),
  me: () => get<User>('/auth/me'),
  users: () => get<User[]>('/auth/users'),
  createUser: (body: { name: string; email: string; password: string; role: string; unitId?: string }) =>
    post<User>('/auth/users', body),
};

// ===== Master =====
export const unitApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    get<Paginated<Unit>>('/units', { params }),
  create: (body: { name: string; isCentral?: boolean; address?: string }) => post<Unit>('/units', body),
  update: (id: string, body: Partial<{ name: string; isCentral?: boolean; address?: string }>) =>
    patch<Unit>(`/units/${id}`, body),
  remove: (id: string) => remove<{ message: string }>(`/units/${id}`),
};

export const supplierApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    get<Paginated<Supplier>>('/suppliers', { params }),
  create: (body: Partial<Supplier>) => post<Supplier>('/suppliers', body),
  update: (id: string, body: Partial<Supplier>) => patch<Supplier>(`/suppliers/${id}`, body),
  remove: (id: string) => remove<{ message: string }>(`/suppliers/${id}`),
};

export const productApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    stockStatus?: 'all' | 'low' | 'ok' | 'out';
  }) => get<Paginated<Product>>('/products', { params }),
  categories: () => get<string[]>('/products/categories'),
  detail: (id: string) => get<Product>(`/products/${id}`),
  create: (body: Partial<Product>) => post<Product>('/products', body),
  update: (id: string, body: Partial<Product>) => patch<Product>(`/products/${id}`, body),
  remove: (id: string) => remove<{ message: string }>(`/products/${id}`),
  batches: (id: string) => get<ProductBatch[]>(`/products/${id}/batches`),
  addBatch: (id: string, body: { unitId: string; batchNo?: string; qty: number; expiryDate?: string }) =>
    post<ProductBatch>(`/products/${id}/batches`, body),
};

// ===== PO =====
export const poApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: POStatus }) =>
    get<Paginated<PurchaseOrder>>('/po', { params }),
  detail: (id: string) => get<PurchaseOrder>(`/po/${id}`),
  create: (body: { supplierId: string; notes?: string; items: { productId: string; qtyOrder: number; price: number }[] }) =>
    post<PurchaseOrder>('/po', body),
  submit: (id: string) => patch<PurchaseOrder>(`/po/${id}/submit`),
  approve: (id: string) => patch<PurchaseOrder>(`/po/${id}/approve`),
  send: (id: string) => patch<PurchaseOrder>(`/po/${id}/send`),
  cancel: (id: string) => patch<PurchaseOrder>(`/po/${id}/cancel`),
  remove: (id: string) => remove<{ message: string }>(`/po/${id}`),
};

// ===== Receiving =====
export const receivingApi = {
  list: (params?: { page?: number; limit?: number }) =>
    get<Paginated<GoodsReceiving>>('/receiving', { params }),
  detail: (id: string) => get<GoodsReceiving>(`/receiving/${id}`),
  create: (body: { poId: string; unitId: string }) => post<GoodsReceiving>('/receiving', body),
  confirm: (id: string, body: { items: { id: string; qtyReceived: number }[] }) =>
    post<GoodsReceiving>(`/receiving/${id}/confirm`, body),
};

// ===== Opname =====
export const opnameApi = {
  list: (params?: { page?: number; limit?: number; status?: OpnameStatus }) =>
    get<Paginated<OpnameSession>>('/opname/sessions', { params }),
  detail: (id: string) => get<OpnameSession>(`/opname/sessions/${id}`),
  create: (body: { unitId: string; scope?: string; scheduledAt?: string }) =>
    post<OpnameSession>('/opname/sessions', body),
  start: (id: string) => post<OpnameSession>(`/opname/sessions/${id}/start`),
  blindCount: (id: string, body: { items: { productId: string; qtyPhysical: number; reason?: string }[] }) =>
    post<OpnameSession>(`/opname/sessions/${id}/blind-count`, body),
  reconcile: (id: string) => post<OpnameSession>(`/opname/sessions/${id}/reconcile`),
  close: (id: string) => post<OpnameSession>(`/opname/sessions/${id}/close`),
};

// ===== Mutation =====
export const mutationApi = {
  list: (params?: { page?: number; limit?: number; status?: MutationStatus }) =>
    get<Paginated<StockMutation>>('/mutations', { params }),
  detail: (id: string) => get<StockMutation>(`/mutations/${id}`),
  create: (body: { fromUnitId: string; toUnitId: string; items: { productId: string; qty: number }[] }) =>
    post<StockMutation>('/mutations', body),
  approve: (id: string) => patch<StockMutation>(`/mutations/${id}/approve`),
  reject: (id: string) => patch<StockMutation>(`/mutations/${id}/reject`),
  pick: (id: string) => patch<StockMutation>(`/mutations/${id}/pick`),
  receive: (id: string) => patch<StockMutation>(`/mutations/${id}/receive`),
};

// ===== Dashboard & Audit =====
export const dashboardApi = {
  summary: () => get<DashboardSummary>('/dashboard/summary'),
  lowStock: (params?: { unitId?: string; limit?: number }) =>
    get<Product[]>('/dashboard/low-stock', { params }),
  expiry: (params?: { unitId?: string; limit?: number }) =>
    get<ProductBatch[]>('/dashboard/expiry', { params }),
  trend: (days = 7) => get<{ labels: string[]; values: number[] }>('/dashboard/trend', { params: { days } }),
  auditLogs: (limit = 20) => get<AuditLog[]>('/audit-logs', { params: { limit } }),
};
