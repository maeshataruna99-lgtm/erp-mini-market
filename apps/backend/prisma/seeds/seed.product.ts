import { Registry } from './data';

export interface SeedProduct {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  isPerishable?: boolean;
}

export const PRODUCTS: SeedProduct[] = [
  { sku: 'IND-GOR-001', barcode: '8991002102200', name: 'Indomie Goreng', category: 'Makanan', unit: 'pcs', minStock: 50, costPrice: 2500, sellPrice: 3500 },
  { sku: 'MIE-SDP-002', barcode: '8998866201001', name: 'Mie Sedaap Goreng', category: 'Makanan', unit: 'pcs', minStock: 50, costPrice: 2400, sellPrice: 3400 },
  { sku: 'BER-RAM-003', barcode: '8997038326009', name: 'Beras Ramos 5kg', category: 'Makanan', unit: 'karung', minStock: 10, costPrice: 68000, sellPrice: 72000 },
  { sku: 'GUL-PAS-004', barcode: '8991002111323', name: 'Gula Pasir 1kg', category: 'Sembako', unit: 'pcs', minStock: 15, costPrice: 16000, sellPrice: 18000 },
  { sku: 'BIM-OIL-005', barcode: '8991002102286', name: 'Minyak Bimoli 2L', category: 'Sembako', unit: 'pcs', minStock: 10, costPrice: 28000, sellPrice: 32000 },
  { sku: 'KCP-BAN-006', barcode: '8998838993455', name: 'Kecap Bango', category: 'Sembako', unit: 'pcs', minStock: 12, costPrice: 14000, sellPrice: 16000 },
  { sku: 'BUM-RAC-007', barcode: '8991002102880', name: 'Bumbu Racik', category: 'Makanan', unit: 'pcs', minStock: 20, costPrice: 2500, sellPrice: 3500 },
  { sku: 'TLR-AYM-008', barcode: '8997029098001', name: 'Telur Ayam 1kg', category: 'Makanan', unit: 'kg', minStock: 10, costPrice: 24000, sellPrice: 27000, isPerishable: true },
  { sku: 'TEH-BTL-009', barcode: '8991001010011', name: 'Teh Botol Sosro', category: 'Minuman', unit: 'pcs', minStock: 30, costPrice: 3500, sellPrice: 4500, isPerishable: true },
  { sku: 'SUS-UHT-010', barcode: '8968669001184', name: 'Susu UHT Ultra 1L', category: 'Minuman', unit: 'pcs', minStock: 20, costPrice: 15000, sellPrice: 18000, isPerishable: true },
  { sku: 'AQU-600-011', barcode: '8992766160002', name: 'Aqua 600ml', category: 'Minuman', unit: 'pcs', minStock: 24, costPrice: 3000, sellPrice: 4000, isPerishable: true },
  { sku: 'KOP-KPL-012', barcode: '8991002114225', name: 'Kopi Kapal Api', category: 'Minuman', unit: 'pcs', minStock: 15, costPrice: 9500, sellPrice: 12000 },
  { sku: 'NUT-TEA-013', barcode: '8999999033111', name: 'Nu Green Tea', category: 'Minuman', unit: 'pcs', minStock: 24, costPrice: 4000, sellPrice: 5000, isPerishable: true },
  { sku: 'CHI-SNK-014', barcode: '8998866201002', name: 'Chitato', category: 'Snack', unit: 'pcs', minStock: 20, costPrice: 8000, sellPrice: 10500 },
  { sku: 'ORE-001', barcode: '7622210600882', name: 'Oreo', category: 'Snack', unit: 'pcs', minStock: 20, costPrice: 7500, sellPrice: 9500 },
  { sku: 'TNG-001', barcode: '8998866201003', name: 'Tango', category: 'Snack', unit: 'pcs', minStock: 20, costPrice: 5000, sellPrice: 6500 },
  { sku: 'BEN-BNG-017', barcode: '8998866201004', name: 'Beng-Beng', category: 'Snack', unit: 'pcs', minStock: 20, costPrice: 2500, sellPrice: 3500 },
  { sku: 'SAB-LIF-018', barcode: '8999999033222', name: 'Sabun Lifebuoy', category: 'Hygiene', unit: 'pcs', minStock: 15, costPrice: 4000, sellPrice: 5500 },
  { sku: 'PST-PEP-019', barcode: '8999999033333', name: 'Pasta Gigi Pepsodent', category: 'Hygiene', unit: 'pcs', minStock: 15, costPrice: 9000, sellPrice: 12000 },
  { sku: 'DET-RIN-020', barcode: '8999999033444', name: 'Deterjen Rinso', category: 'Hygiene', unit: 'pcs', minStock: 10, costPrice: 18000, sellPrice: 22000 },
];

export async function seedProducts(reg: Registry): Promise<void> {
  for (const p of PRODUCTS) {
    const product = await reg.prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        unit: p.unit,
        minStock: p.minStock,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        isPerishable: p.isPerishable ?? false,
      },
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
    reg.products[p.sku] = product.id;
  }
}
