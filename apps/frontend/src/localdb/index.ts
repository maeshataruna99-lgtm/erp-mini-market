import { seedIfNeeded } from './seed';
import { handle } from './router';
import type { ApiMeta } from './helpers';

export interface ReqConfig {
  params?: Record<string, unknown>;
}

let seedPromise: Promise<void> | null = null;
export function ensureSeeded(): Promise<void> {
  seedPromise ??= seedIfNeeded();
  return seedPromise;
}

async function resolve<T>(method: string, url: string, body?: unknown, config?: ReqConfig): Promise<T> {
  await ensureSeeded();
  const res = await handle(method, url, body, config?.params);
  return res.data as T;
}

export async function get<T>(url: string, config?: ReqConfig): Promise<T> {
  return resolve<T>('GET', url, undefined, config);
}

export async function paginated<T>(url: string, config?: ReqConfig): Promise<{ data: T[]; meta: ApiMeta }> {
  await ensureSeeded();
  const res = await handle('GET', url, undefined, config?.params);
  return {
    data: (res.data as T[]) ?? [],
    meta: res.meta ?? { page: 1, limit: 0, total: 0, totalPages: 0 },
  };
}

export async function post<T>(url: string, body?: unknown, config?: ReqConfig): Promise<T> {
  return resolve<T>('POST', url, body, config);
}

export async function patch<T>(url: string, body?: unknown, config?: ReqConfig): Promise<T> {
  return resolve<T>('PATCH', url, body, config);
}

export async function remove<T>(url: string, config?: ReqConfig): Promise<T> {
  return resolve<T>('DELETE', url, undefined, config);
}
