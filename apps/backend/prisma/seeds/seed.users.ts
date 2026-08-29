import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Registry } from './data';

export const USERS = [
  { key: 'admin', name: 'Admin Utama', email: 'admin@minierp.id', role: Role.ADMIN, unitId: 'unit-central' },
  { key: 'manager', name: 'Manager Operasional', email: 'manager@minierp.id', role: Role.MANAGER, unitId: 'unit-central' },
  { key: 'gudang', name: 'Staff Gudang', email: 'gudang@minierp.id', role: Role.STAFF_GUDANG, unitId: 'unit-central' },
  { key: 'kasir', name: 'Kasir Pusat', email: 'kasir@minierp.id', role: Role.STAFF_KASIR, unitId: 'unit-central' },
  { key: 'kasir-cabang', name: 'Kasir Cabang', email: 'kasircabang@minierp.id', role: Role.STAFF_KASIR, unitId: 'unit-cabang-1' },
];

export async function seedUsers(reg: Registry): Promise<void> {
  const passwordHash = await bcrypt.hash('admin123', 10);
  for (const u of USERS) {
    const user = await reg.prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, unitId: u.unitId },
      create: { name: u.name, email: u.email, passwordHash, role: u.role, unitId: u.unitId },
    });
    reg.users[u.key] = user.id;
  }
}
