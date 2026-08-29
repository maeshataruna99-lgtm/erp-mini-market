import { ResponseHelper } from './response.helper';
import { PaginationHelper } from './pagination.helper';
import { DateHelper } from './date.helper';
import { SequenceHelper } from './sequence.helper';
import { CryptoHelper } from './crypto.helper';
import { ExcelHelper } from './excel.helper';

describe('ResponseHelper', () => {
  it('membuat response sukses', () => {
    const res = ResponseHelper.success({ id: '1' }, 'OK');
    expect(res.success).toBe(true);
    expect(res.message).toBe('OK');
    expect(res.data).toEqual({ id: '1' });
    expect(res.timestamp).toBeDefined();
  });

  it('membuat response error', () => {
    const res = ResponseHelper.error('Gagal', ['field wajib']);
    expect(res.success).toBe(false);
    expect(res.data).toBeNull();
    expect(res.errors).toEqual(['field wajib']);
  });

  it('menyertakan meta pagination', () => {
    const res = ResponseHelper.success([], 'OK', { page: 1, limit: 10 });
    expect(res.meta).toEqual({ page: 1, limit: 10 });
  });
});

describe('PaginationHelper', () => {
  it('menormalkan nilai default', () => {
    const p = PaginationHelper.normalize(undefined, undefined);
    expect(p).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('membatasi limit maksimal', () => {
    const p = PaginationHelper.normalize(1, 9999);
    expect(p.limit).toBe(100);
  });

  it('menghitung skip dan meta dengan benar', () => {
    const p = PaginationHelper.normalize(3, 10);
    expect(p.skip).toBe(20);
    const meta = PaginationHelper.buildMeta(3, 10, 45);
    expect(meta).toEqual({ page: 3, limit: 10, total: 45, totalPages: 5 });
  });
});

describe('DateHelper', () => {
  it('menghitung daysUntil benar', () => {
    const future = new Date(Date.now() + 3 * 86_400_000);
    expect(DateHelper.daysUntil(future)).toBe(3);
  });

  it('mendeteksi expiry mendekat', () => {
    const near = new Date(Date.now() + 10 * 86_400_000);
    expect(DateHelper.isExpiringSoon(near, 30)).toBe(true);
    const far = new Date(Date.now() + 100 * 86_400_000);
    expect(DateHelper.isExpiringSoon(far, 30)).toBe(false);
  });

  it('menambah hari', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const plus = DateHelper.addDays(base, 5);
    expect(plus.toISOString().slice(0, 10)).toBe('2026-01-06');
  });

  it('menghasilkan date key lokal', () => {
    const d = new Date(2026, 7, 29); // 29 Agustus 2026 lokal
    expect(DateHelper.toDateKey(d)).toBe('2026-08-29');
  });
});

describe('SequenceHelper', () => {
  it('membuat kode dengan format prefix-tahun-sekuens', () => {
    const code = SequenceHelper.next('PO', 12);
    expect(code).toMatch(/^PO-20\d\d-0013$/);
  });

  it('parse sekuens terakhir dari kode', () => {
    expect(SequenceHelper.parseLastSequence('PO-2026-0007')).toBe(7);
    expect(SequenceHelper.parseLastSequence(null)).toBe(0);
    expect(SequenceHelper.parseLastSequence(undefined)).toBe(0);
  });

  it('default sekuens 1 saat kosong', () => {
    expect(SequenceHelper.next('MUT')).toBe(`MUT-${new Date().getFullYear()}-0001`);
  });
});

describe('CryptoHelper', () => {
  it('hash dan verifikasi password', async () => {
    const hash = await CryptoHelper.hashPassword('admin123');
    expect(hash).not.toBe('admin123');
    expect(await CryptoHelper.verifyPassword('admin123', hash)).toBe(true);
    expect(await CryptoHelper.verifyPassword('wrong', hash)).toBe(false);
  });

  it('membuat sha256 yang deterministik', () => {
    const a = CryptoHelper.sha256('abc');
    const b = CryptoHelper.sha256('abc');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('membuat token acak', () => {
    const t1 = CryptoHelper.randomToken(16);
    const t2 = CryptoHelper.randomToken(16);
    expect(t1).not.toBe(t2);
    expect(t1).toHaveLength(32);
  });
});

describe('ExcelHelper', () => {
  it('membuat CSV string', () => {
    const csv = ExcelHelper.toCsvString(['Nama', 'Qty'], [['Mie', 10], ['Air, Mineral', 5]]);
    expect(csv).toContain('"Air, Mineral"');
    expect(csv).toContain('Nama,Qty');
  });

  it('membuat buffer xlsx', async () => {
    const buf = await ExcelHelper.toXlsxBuffer(
      [{ header: 'Nama', key: 'name' }],
      [{ name: 'Indomie' }],
    );
    expect(buf.length).toBeGreaterThan(1000);
  });
});
