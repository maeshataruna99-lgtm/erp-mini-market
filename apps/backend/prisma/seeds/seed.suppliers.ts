import { Registry } from './data';

export const SUPPLIERS = [
  { id: 'sup-indofood', name: 'PT Indofood CBP', phone: '021-5551001', email: 'sales@indofood.co.id', address: 'Jakarta' },
  { id: 'sup-mayora', name: 'PT Mayora Indah', phone: '021-5551002', email: 'sales@mayora.co.id', address: 'Tangerang' },
  { id: 'sup-unilever', name: 'PT Unilever Indonesia', phone: '021-5551003', email: 'sales@unilever.co.id', address: 'Jakarta' },
  { id: 'sup-wings', name: 'PT Wings Surya', phone: '021-5551004', email: 'sales@wings.co.id', address: 'Surabaya' },
  { id: 'sup-sosro', name: 'PT Sinar Sosro', phone: '021-5551005', email: 'sales@sosro.co.id', address: 'Semarang' },
];

export async function seedSuppliers(reg: Registry): Promise<void> {
  for (const s of SUPPLIERS) {
    await reg.prisma.supplier.upsert({
      where: { id: s.id },
      update: { name: s.name, phone: s.phone, email: s.email, address: s.address },
      create: s,
    });
  }
}
