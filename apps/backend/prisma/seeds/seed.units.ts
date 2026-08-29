import { Registry } from './data';

export const UNITS = [
  { id: 'unit-central', name: 'Gudang Pusat', isCentral: true, address: 'Jl. Raya Pusat No.1, Yogyakarta' },
  { id: 'unit-cabang-1', name: 'Cabang Malioboro', isCentral: false, address: 'Jl. Malioboro No.88, Yogyakarta' },
  { id: 'unit-cabang-2', name: 'Cabang Seturan', isCentral: false, address: 'Jl. Seturan No.12, Sleman' },
];

export async function seedUnits(reg: Registry): Promise<void> {
  for (const u of UNITS) {
    await reg.prisma.unit.upsert({
      where: { id: u.id },
      update: { name: u.name, isCentral: u.isCentral, address: u.address },
      create: u,
    });
  }
}
