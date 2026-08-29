export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

let counter = 0;
export function newId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  counter = (counter + 1) % 36;
  return `c${ts}${rand}${counter.toString(36)}`;
}

export function normalizePagination(page?: number, limit?: number, maxLimit = 100): PaginationParams {
  const safePage = page && page > 0 ? Math.floor(page) : 1;
  const safeLimit = limit && limit > 0 ? Math.min(Math.floor(limit), maxLimit) : 20;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function buildMeta(page: number, limit: number, total: number): ApiMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function lowerContains(value: string | null | undefined, search: string): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(search.toLowerCase());
}

export function toDateKey(date: Date | string): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toISO(date: Date | string): string {
  return new Date(date).toISOString();
}

export function httpError(message: string): Error {
  return new Error(message);
}
