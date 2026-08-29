import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

export class CryptoHelper {
  static async hashPassword(plain: string, rounds = 10): Promise<string> {
    return bcrypt.hash(plain, rounds);
  }

  static async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  static randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  static sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const masked = local.slice(0, 2) + '***';
    return `${masked}@${domain}`;
  }
}
