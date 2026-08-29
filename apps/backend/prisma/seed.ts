import { PrismaClient } from '@prisma/client';
import { createRegistry, getStock } from './seeds/data';
import { seedUnits } from './seeds/seed.units';
import { seedUsers } from './seeds/seed.users';
import { seedSuppliers } from './seeds/seed.suppliers';
import { seedProducts, PRODUCTS } from './seeds/seed.product';
import { seedStock, INITIAL_STOCK, isLowStock } from './seeds/seed.stock';
import { seedBatches } from './seeds/seed.batch';
import { seedPOs } from './seeds/seed.po';
import { seedReceivings } from './seeds/seed.receiving';
import { seedMutations } from './seeds/seed.mutation';
import { seedOpnames } from './seeds/seed.opname';
import { flushStock } from './seeds/seed.flush';

const prisma = new PrismaClient();

async function main() {
  const reg = createRegistry(prisma);

  await seedUnits(reg);
  await seedUsers(reg);
  await seedSuppliers(reg);
  await seedProducts(reg);
  await seedStock(reg);
  await seedBatches(reg);
  await seedPOs(reg);
  await seedReceivings(reg);
  await seedMutations(reg);
  await seedOpnames(reg);
  await flushStock(reg);

  let lowStock = 0;
  let expiring = 0;
  let totalQty = 0;
  for (const sku of Object.keys(reg.products)) {
    const productId = reg.products[sku];
    for (const unitId of Object.keys(INITIAL_STOCK)) {
      const s = getStock(reg, productId, unitId);
      if (s.qty <= 0) continue;
      totalQty += s.qty;
      if (isLowStock(reg, sku, unitId)) lowStock++;
      if (s.batches.some((b) => b.expiryDate && b.expiryDate.getTime() <= Date.now() + 30 * 86400000)) {
        expiring++;
      }
    }
  }

  console.log('Seed selesai. Akun:');
  console.log(`  admin@minierp.id / admin123 (ADMIN)`);
  console.log(`  manager@minierp.id / admin123 (MANAGER)`);
  console.log(`  gudang@minierp.id / admin123 (STAFF_GUDANG)`);
  console.log(`  kasir@minierp.id / admin123 (STAFF_KASIR)`);
  console.log(`  kasircabang@minierp.id / admin123 (STAFF_KASIR)`);
  console.log(`Produk: ${PRODUCTS.length} | low-stock: ${lowStock} | expiring≤30d: ${expiring} | total stok: ${totalQty}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
