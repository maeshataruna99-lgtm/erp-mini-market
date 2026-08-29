const encoder = new TextEncoder();

async function digest(input: string): Promise<string> {
  const data = encoder.encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256(value: string): Promise<string> {
  return digest(value);
}

const PREFIX = 'minierp$1$';

export async function hashPassword(plain: string): Promise<string> {
  return PREFIX + (await digest(plain));
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (stored.startsWith(PREFIX)) {
    const expected = await digest(plain);
    return stored === PREFIX + expected;
  }
  return (await digest(plain)) === stored;
}

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function dummyJwt(payload: Record<string, unknown>): string {
  const header = b64url({ alg: 'none', typ: 'JWT' });
  const body = b64url(payload);
  return `${header}.${body}.dummy`;
}

export function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
