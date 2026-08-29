import { DateHelper } from '../../src/common/helpers/date.helper';
import { Registry, setBatch } from './data';
import { PRODUCTS } from './seed.product';
import { INITIAL_STOCK } from './seed.stock';

const PERISHABLE = new Set(
  PRODUCTS.filter((p) => p.isPerishable).map((p) => p.sku),
);

const EXPIRY_LAYOUT: Record<string, [number, number]> = {
  'TLR-AYM-008': [12, 45],
  'TEH-BTL-009': [10, 90],
  'SUS-UHT-010': [15, 60],
  'AQU-600-011': [20, 30],
  'NUT-TEA-013': [20, 90],
};

export async function seedBatches(reg: Registry): Promise<void> {
  for (const unitId of Object.keys(INITIAL_STOCK)) {
    for (const sku of Object.keys(INITIAL_STOCK[unitId])) {
      const productId = reg.products[sku];
      if (!productId) continue;
      const qty = INITIAL_STOCK[unitId][sku];
      if (qty <= 0) continue;

      if (PERISHABLE.has(sku)) {
        const [soonDays, laterDays] = EXPIRY_LAYOUT[sku] ?? [30, 90];
        const soon = Math.ceil(qty / 2);
        const later = qty - soon;
        setBatch(reg, productId, unitId, `batch-${productId}-${unitId}-1`, soon, DateHelper.addDays(new Date(), soonDays));
        if (later > 0) {
          setBatch(reg, productId, unitId, `batch-${productId}-${unitId}-2`, later, DateHelper.addDays(new Date(), laterDays));
        }
      } else {
        setBatch(reg, productId, unitId, `batch-${productId}-${unitId}-1`, qty, null);
      }
    }
  }
}
