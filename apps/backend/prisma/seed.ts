import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const central = await prisma.unit.upsert({
    where: { id: 'unit-central' },
    update: {},
    create: {
      id: 'unit-central',
      name: 'Gudang Pusat',
      isCentral: true,
      address: 'Jl. Raya Pusat No.1',
    },
  });

  const branch = await prisma.unit.upsert({
    where: { id: 'unit-branch' },
    update: {},
    create: {
      id: 'unit-branch',
      name: 'Cabang Malioboro',
      isCentral: false,
      address: 'Jl. Malioboro No.88',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@minierp.id' },
    update: {},
    create: {
      name: 'Admin Utama',
      email: 'admin@minierp.id',
      passwordHash,
      role: Role.ADMIN,
      unitId: central.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'kasir@minierp.id' },
    update: {},
    create: {
      name: 'Kasir Satu',
      email: 'kasir@minierp.id',
      passwordHash,
      role: Role.STAFF_KASIR,
      unitId: branch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'gudang@minierp.id' },
    update: {},
    create: {
      name: 'Staff Gudang',
      email: 'gudang@minierp.id',
      passwordHash,
      role: Role.STAFF_GUDANG,
      unitId: central.id,
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { id: 'sup-indofood' },
    update: {},
    create: {
      id: 'sup-indofood',
      name: 'PT Indofood CBP',
      phone: '021-5551001',
      email: 'sales@indofood.co.id',
      address: 'Jakarta',
    },
  });

  await prisma.supplier.upsert({
    where: { id: 'sup-mayora' },
    update: {},
    create: {
      id: 'sup-mayora',
      name: 'PT Mayora Indah',
      phone: '021-5551002',
      email: 'sales@mayora.co.id',
      address: 'Tangerang',
    },
  });

  const products = [
    {
      sku: 'IND-GOR-001',
      barcode: '8991002102200',
      name: 'Indomie Goreng',
      category: 'Makanan',
      unit: 'pcs',
      minStock: 50,
      costPrice: 2500,
      sellPrice: 3500,
    },
    {
      sku: 'SOS-TBH-002',
      barcode: '8991001001010',
      name: 'Teh Botol Sosro',
      category: 'Minuman',
      unit: 'pcs',
      minStock: 30,
      costPrice: 3500,
      sellPrice: 4500,
      isPerishable: true,
    },
    {
      sku: 'BIM-OIL-003',
      barcode: '8991006003030',
      name: 'Minyak Bimoli 2L',
      category: 'Sembako',
      unit: 'pcs',
      minStock: 10,
      costPrice: 28000,
      sellPrice: 32000,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        unit: p.unit,
        minStock: p.minStock,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        isPerishable: p.isPerishable ?? false,
      },
    });

    await prisma.stockLevel.upsert({
      where: { productId_unitId: { productId: product.id, unitId: central.id } },
      update: {},
      create: { productId: product.id, unitId: central.id, qty: 120 },
    });
  }

  console.log('Seed selesai. Akun:');
  console.log(`  admin@minierp.id / admin123 (ADMIN) -> unit ${central.name}`);
  console.log(`  kasir@minierp.id / admin123 (STAFF_KASIR)`);
  console.log(`  gudang@minierp.id / admin123 (STAFF_GUDANG)`);
  console.log(`Supplier: ${supplier.name} + Mayora`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
