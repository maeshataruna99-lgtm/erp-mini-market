import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaginationHelper } from '../../../common/helpers/pagination.helper';
import {
  CreateProductBatchDto,
  CreateProductDto,
  QueryProductDto,
  UpdateProductDto,
} from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const { page, limit, skip } = PaginationHelper.normalize(query.page, query.limit);
    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) {
      where.category = query.category;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: { stockLevels: { include: { unit: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let filtered = products;
    if (query.stockStatus === 'low') {
      filtered = products.filter((p) => p.stockLevels.some((s) => s.qty < p.minStock));
    } else if (query.stockStatus === 'ok') {
      filtered = products.filter((p) => p.stockLevels.every((s) => s.qty >= p.minStock));
    } else if (query.stockStatus === 'out') {
      filtered = products.filter(
        (p) => p.stockLevels.length === 0 || p.stockLevels.every((s) => s.qty === 0),
      );
    }

    const total = filtered.length;
    const items = filtered.slice(skip, skip + limit);
    return { items, meta: PaginationHelper.buildMeta(page, limit, total) };
  }

  async findCategories(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });
    return rows
      .map((r) => r.category)
      .filter((c): c is string => typeof c === 'string')
      .sort();
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        stockLevels: { include: { unit: true } },
        batches: { orderBy: { expiryDate: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        sku: dto.sku,
        barcode: dto.barcode ?? null,
        name: dto.name,
        category: dto.category ?? null,
        unit: dto.unit,
        minStock: dto.minStock ?? 0,
        costPrice: dto.costPrice,
        sellPrice: dto.sellPrice,
        isPerishable: dto.isPerishable ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Produk berhasil dihapus' };
  }

  async listBatches(productId: string) {
    await this.findOne(productId);
    return this.prisma.productBatch.findMany({
      where: { productId },
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'desc' }],
    });
  }

  async addBatch(productId: string, dto: CreateProductBatchDto) {
    await this.findOne(productId);
    return this.prisma.productBatch.create({
      data: {
        productId,
        unitId: dto.unitId,
        batchNo: dto.batchNo ?? null,
        qty: dto.qty,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });
  }
}
