import { PrismaClient } from '@prisma/client';
import { Registry } from './data';

export async function flushStock(reg: Registry): Promise<void> {
  const prisma: PrismaClient = reg.prisma;
  for (const [key, entry] of reg.stock) {
    const [productId, unitId] = key.split('|');

    await prisma.stockLevel.upsert({
      where: { productId_unitId: { productId, unitId } },
      update: { qty: entry.qty },
      create: { productId, unitId, qty: entry.qty },
    });

    const existing = await prisma.productBatch.findMany({ where: { productId, unitId } });
    const keptIds = new Set(entry.batches.filter((b) => b.qty > 0).map((b) => b.id));

    for (const b of entry.batches) {
      if (b.qty <= 0) continue;
      await prisma.productBatch.upsert({
        where: { id: b.id },
        update: { qty: b.qty, expiryDate: b.expiryDate },
        create: {
          id: b.id,
          productId,
          unitId,
          batchNo: null,
          qty: b.qty,
          expiryDate: b.expiryDate,
        },
      });
    }

    for (const e of existing) {
      if (!keptIds.has(e.id)) {
        await prisma.productBatch.delete({ where: { id: e.id } });
      }
    }
  }
}
