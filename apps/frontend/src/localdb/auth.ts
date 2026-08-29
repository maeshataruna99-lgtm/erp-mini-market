import {
  findById,
  findOne,
  findWhere,
  insert,
  nextId,
  removeWhere,
  sanitizeUser,
} from './db';
import type { RefreshTokenRow, UserRow } from './db';
import { httpError } from './helpers';
import { dummyJwt, hashPassword, randomToken, sha256, verifyPassword } from './crypto';
import type { AuthResponse, Role, User } from '@/types';

const USER_STORAGE_KEY = 'minierp_user';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  unitId: string | null;
  unitName?: string;
}

export function getCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

function generateTokens(user: UserRow): { accessToken: string; refreshToken: string } {
  const accessToken = dummyJwt({
    sub: user.id,
    email: user.email,
    role: user.role,
    unitId: user.unitId,
    name: user.name,
  });
  const refreshToken = dummyJwt({ sub: user.id }) + '.' + randomToken();
  const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  void sha256(refreshToken).then((tokenHash) => {
    insert<RefreshTokenRow>('refreshTokens', {
      id: nextId(),
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
    });
  });
  return { accessToken, refreshToken };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const user = findOne<UserRow>('users', (u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw httpError('Email atau password salah');
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw httpError('Email atau password salah');
  const tokens = generateTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const tokenHash = await sha256(refreshToken);
  const stored = findOne<RefreshTokenRow>('refreshTokens', (r) => r.tokenHash === tokenHash);
  if (!stored || new Date(stored.expiresAt).getTime() < Date.now()) {
    throw httpError('Refresh token sudah tidak berlaku');
  }
  const user = findById<UserRow>('users', stored.userId);
  if (!user) throw httpError('User tidak ditemukan');
  removeWhere<RefreshTokenRow>('refreshTokens', (r) => r.id === stored.id);
  const tokens = generateTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = await sha256(refreshToken);
  removeWhere<RefreshTokenRow>('refreshTokens', (r) => r.tokenHash === tokenHash);
}

export function me(userId: string): User {
  const user = findById<UserRow>('users', userId);
  if (!user) throw httpError('User tidak ditemukan');
  return sanitizeUser(user);
}

export function listUsers(): User[] {
  return findWhere<UserRow>('users', () => true)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(sanitizeUser);
}

export async function createUser(body: {
  name: string;
  email: string;
  password: string;
  role: Role;
  unitId?: string;
}): Promise<User> {
  const existing = findOne<UserRow>('users', (u) => u.email.toLowerCase() === body.email.toLowerCase());
  if (existing) throw httpError('Email sudah terdaftar');
  const passwordHash = await hashPassword(body.password);
  const user: UserRow = {
    id: nextId(),
    name: body.name,
    email: body.email,
    passwordHash,
    role: body.role,
    unitId: body.unitId ?? null,
    createdAt: new Date().toISOString(),
  };
  insert<UserRow>('users', user);
  return sanitizeUser(user);
}

export function requireRole(user: CurrentUser | null, roles: Role[]): void {
  if (!user) throw httpError('Tidak terautentikasi');
  if (user.role === 'ADMIN') return;
  if (!roles.includes(user.role)) throw httpError('Anda tidak memiliki akses untuk aksi ini');
}
