import { getCurrentUser, requireRole } from './auth';
import type { CurrentUser } from './auth';
import * as authApi from './auth';
import * as master from './master';
import * as po from './po';
import * as receiving from './receiving';
import * as opname from './opname';
import * as mutation from './mutation';
import * as dashboard from './dashboard';
import type { ApiMeta } from './helpers';

export interface HandleResult {
  data: unknown;
  meta?: ApiMeta;
}

type Params = Record<string, unknown>;

function stripPrefix(path: string): string {
  return path.replace(/^\/api\/v1/, '');
}

export async function handle(method: string, rawPath: string, body?: unknown, params?: Params): Promise<HandleResult> {
  const path = stripPrefix(rawPath);
  const segments = path.split('/').filter(Boolean);
  const user = getCurrentUser();
  const require = (roles: CurrentUser['role'][]) => requireRole(user, roles);
  const requireUser = (): CurrentUser => {
    if (!user) throw new Error('Tidak terautentikasi');
    return user;
  };
  const query = params ?? {};

  // ===== Auth =====
  if (segments[0] === 'auth') {
    const b = (body ?? {}) as Record<string, unknown>;
    if (method === 'POST' && segments[1] === 'login') {
      return asResult(await authApi.login(b.email as string, b.password as string));
    }
    if (method === 'POST' && segments[1] === 'refresh') {
      return asResult(await authApi.refresh(b.refreshToken as string));
    }
    if (method === 'POST' && segments[1] === 'logout') {
      await authApi.logout(b.refreshToken as string);
      return asResult({ message: 'Logout berhasil' });
    }
    if (method === 'GET' && segments[1] === 'me') {
      return asResult(authApi.me(requireUser().id));
    }
    if (segments[1] === 'users') {
      if (method === 'GET') {
        require(['ADMIN', 'MANAGER']);
        return asResult(authApi.listUsers());
      }
      if (method === 'POST') {
        require(['ADMIN']);
        return asResult(await authApi.createUser(b as never));
      }
    }
  }

  // ===== Units =====
  if (segments[0] === 'units') {
    if (method === 'GET') return asResult(master.listUnits(query as never));
    if (method === 'POST') { require(['ADMIN', 'MANAGER']); return asResult(master.createUnit(body as never)); }
    if (segments.length === 2) {
      if (method === 'PATCH') { require(['ADMIN', 'MANAGER']); return asResult(master.updateUnit(segments[1], body as never)); }
      if (method === 'DELETE') { require(['ADMIN']); return asResult(master.removeUnit(segments[1])); }
    }
  }

  // ===== Suppliers =====
  if (segments[0] === 'suppliers') {
    if (method === 'GET') return asResult(master.listSuppliers(query as never));
    if (method === 'POST') { require(['ADMIN', 'MANAGER']); return asResult(master.createSupplier(body as never)); }
    if (segments.length === 2) {
      if (method === 'PATCH') { require(['ADMIN', 'MANAGER']); return asResult(master.updateSupplier(segments[1], body as never)); }
      if (method === 'DELETE') { require(['ADMIN']); return asResult(master.removeSupplier(segments[1])); }
    }
  }

  // ===== Products =====
  if (segments[0] === 'products') {
    if (method === 'GET' && segments.length === 1) return asResult(master.listProducts(query as never));
    if (method === 'POST' && segments.length === 1) { require(['ADMIN', 'MANAGER']); return asResult(master.createProduct(body as never)); }
    if (method === 'GET' && segments[1] === 'categories') return asResult(master.listCategories());
    if (segments.length === 2) {
      if (method === 'GET') return asResult(master.getProduct(segments[1]));
      if (method === 'PATCH') { require(['ADMIN', 'MANAGER']); return asResult(master.updateProduct(segments[1], body as never)); }
      if (method === 'DELETE') { require(['ADMIN']); return asResult(master.removeProduct(segments[1])); }
    }
    if (segments.length === 3 && segments[2] === 'batches') {
      if (method === 'GET') return asResult(master.listBatches(segments[1]));
      if (method === 'POST') { require(['ADMIN', 'MANAGER']); return asResult(master.addBatch(segments[1], body as never)); }
    }
  }

  // ===== PO =====
  if (segments[0] === 'po') {
    if (method === 'GET' && segments.length === 1) return asResult(po.listPo(query as never));
    if (method === 'POST' && segments.length === 1) return asResult(po.createPo(body as never, requireUser()));
    if (segments.length >= 2) {
      const id = segments[1];
      if (method === 'GET') return asResult(po.getPo(id));
      if (method === 'DELETE') return asResult(po.removePo(id, requireUser()));
      if (method === 'PATCH' && segments[2]) {
        const action = segments[2];
        if (action === 'submit') return asResult(po.submitPo(id, requireUser()));
        if (action === 'approve') { require(['MANAGER', 'ADMIN']); return asResult(po.approvePo(id, requireUser())); }
        if (action === 'send') return asResult(po.sendPo(id));
        if (action === 'cancel') return asResult(po.cancelPo(id, requireUser()));
      }
    }
  }

  // ===== Receiving =====
  if (segments[0] === 'receiving') {
    if (method === 'GET' && segments.length === 1) return asResult(receiving.listReceiving(query as never));
    if (method === 'POST' && segments.length === 1) return asResult(receiving.createReceiving(body as never, requireUser()));
    if (segments.length >= 2) {
      const id = segments[1];
      if (method === 'GET') return asResult(receiving.getReceiving(id));
      if (method === 'POST' && segments[2] === 'confirm') return asResult(receiving.confirmReceiving(id, body as never, requireUser()));
    }
  }

  // ===== Opname =====
  if (segments[0] === 'opname' && segments[1] === 'sessions') {
    if (method === 'GET' && segments.length === 2) return asResult(opname.listOpname(query as never));
    if (method === 'POST' && segments.length === 2) return asResult(opname.createOpname(body as never, requireUser()));
    if (segments.length >= 3) {
      const id = segments[2];
      if (method === 'GET') return asResult(opname.getOpname(id));
      if (method === 'POST' && segments[3]) {
        const action = segments[3];
        if (action === 'start') return asResult(opname.startOpname(id, requireUser()));
        if (action === 'blind-count') return asResult(opname.blindCount(id, body as never, requireUser()));
        if (action === 'reconcile') return asResult(opname.reconcileOpname(id, requireUser()));
        if (action === 'close') return asResult(opname.closeOpname(id));
      }
    }
  }

  // ===== Mutation =====
  if (segments[0] === 'mutations') {
    if (method === 'GET' && segments.length === 1) return asResult(mutation.listMutation(query as never));
    if (method === 'POST' && segments.length === 1) return asResult(mutation.createMutation(body as never, requireUser()));
    if (segments.length >= 2) {
      const id = segments[1];
      if (method === 'GET') return asResult(mutation.getMutation(id));
      if (method === 'PATCH' && segments[2]) {
        const action = segments[2];
        if (action === 'approve') { require(['MANAGER', 'ADMIN']); return asResult(mutation.approveMutation(id, requireUser())); }
        if (action === 'reject') { require(['MANAGER', 'ADMIN']); return asResult(mutation.rejectMutation(id)); }
        if (action === 'pick') return asResult(mutation.pickMutation(id));
        if (action === 'receive') return asResult(mutation.receiveMutation(id, requireUser()));
      }
    }
  }

  // ===== Dashboard & Audit =====
  if (segments[0] === 'dashboard') {
    if (segments[1] === 'summary') return asResult(dashboard.summary());
    if (segments[1] === 'low-stock') return asResult(dashboard.lowStock(query.unitId as string | undefined, query.limit as number | undefined));
    if (segments[1] === 'expiry') return asResult(dashboard.expiry(query.unitId as string | undefined, query.limit as number | undefined));
    if (segments[1] === 'trend') return asResult(dashboard.weeklyTrend(Number(query.days) || 7));
  }
  if (segments[0] === 'audit-logs' && method === 'GET') {
    return asResult(dashboard.auditLogs(Number(query.limit) || 20));
  }

  throw new Error('Endpoint tidak ditemukan');
}

function asResult(result: unknown): HandleResult {
  if (result && typeof result === 'object' && 'data' in (result as Record<string, unknown>) && 'meta' in (result as Record<string, unknown>)) {
    const r = result as { data: unknown; meta?: ApiMeta };
    return { data: r.data, meta: r.meta };
  }
  return { data: result };
}
