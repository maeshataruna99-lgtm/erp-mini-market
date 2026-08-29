import { Registry, setStockQty } from './data';
import { PRODUCTS } from './seed.product';

const CENTRAL = 'unit-central';
const CABANG1 = 'unit-cabang-1';
const CABANG2 = 'unit-cabang-2';

export const INITIAL_STOCK: Record<string, Record<string, number>> = {
  [CENTRAL]: {
    'IND-GOR-001': 100,
    'MIE-SDP-002': 80,
    'BER-RAM-003': 5,
    'GUL-PAS-004': 20,
    'BIM-OIL-005': 12,
    'KCP-BAN-006': 15,
    'BUM-RAC-007': 30,
    'TLR-AYM-008': 10,
    'TEH-BTL-009': 40,
    'SUS-UHT-010': 50,
    'AQU-600-011': 24,
    'KOP-KPL-012': 8,
    'NUT-TEA-013': 24,
    'CHI-SNK-014': 25,
    'ORE-001': 20,
    'TNG-001': 22,
    'BEN-BNG-017': 30,
    'SAB-LIF-018': 15,
    'PST-PEP-019': 18,
    'DET-RIN-020': 12,
  },
  [CABANG1]: {
    'TEH-BTL-009': 0,
    'SUS-UHT-010': 0,
    'AQU-600-011': 24,
    'IND-GOR-001': 40,
    'SAB-LIF-018': 10,
  },
  [CABANG2]: {
    'AQU-600-011': 24,
    'NUT-TEA-013': 12,
    'IND-GOR-001': 30,
  },
};

export async function seedStock(reg: Registry): Promise<void> {
  for (const unitId of Object.keys(INITIAL_STOCK)) {
    for (const sku of Object.keys(INITIAL_STOCK[unitId])) {
      const productId = reg.products[sku];
      if (!productId) continue;
      setStockQty(reg, productId, unitId, INITIAL_STOCK[unitId][sku]);
    }
  }
}

export function isLowStock(reg: Registry, sku: string, unitId: string): boolean {
  const p = PRODUCTS.find((x) => x.sku === sku);
  if (!p) return false;
  const productId = reg.products[sku];
  if (!productId) return false;
  const s = reg.stock.get(`${productId}|${unitId}`);
  return s ? s.qty < p.minStock : false;
}
