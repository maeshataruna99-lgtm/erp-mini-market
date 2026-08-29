import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { POStatus, Prisma, ReceivingStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationHelper } from '../../../common/helpers/notification.helper';
import { ConfirmReceivingDto, CreateReceivingDto } from './dto/receiving.dto';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class ReceivingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page && query.page > 0 ? Math.floor(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(Math.floor(query.limit), 100) : 20;
    const where: Prisma.GoodsReceivingWhereInput = query.search
      ? {
          OR: [
            { po: { poNumber: { contains: query.search, mode: 'insensitive' } } },
            { po: { supplier: { name: { contains: query.search, mode: 'insensitive' } } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.goodsReceiving.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          po: { select: { id: true, poNumber: true, supplier: { select: { name: true } } } },
          receivedBy: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.goodsReceiving.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const receiving = await this.prisma.goodsReceiving.findUnique({
      where: { id },
      include: {
        po: { include: { supplier: true } },
        receivedBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
      },
    });
    if (!receiving) throw new NotFoundException('Goods Receiving tidak ditemukan');
    return receiving;
  }

  async create(dto: CreateReceivingDto, user: AuthUser) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.poId },
      include: { items: true, goodsReceivings: true },
    });
    if (!po) throw new NotFoundException('Purchase Order tidak ditemukan');
    if (po.status !== POStatus.SENT) {
      throw new BadRequestException('Hanya PO berstatus SENT yang dapat diterima');
    }
    if (po.goodsReceivings.some((r) => r.status === ReceivingStatus.COMPLETED)) {
      throw new BadRequestException('PO ini sudah pernah diterima penuh');
    }

    return this.prisma.goodsReceiving.create({
      data: {
        poId: po.id,
        receivedById: user.sub,
        unitId: dto.unitId,
        items: {
          create: po.items.map((item) => ({
            productId: item.productId,
            qtyOrdered: item.qtyOrder,
            qtyReceived: 0,
          })),
        },
      },
      include: { items: true, po: true },
    });
  }

  async confirm(id: string, dto: ConfirmReceivingDto, user: AuthUser) {
    const receiving = await this.prisma.goodsReceiving.findUnique({
      where: { id },
      include: { items: true, po: true },
    });
    if (!receiving) throw new NotFoundException('Goods Receiving tidak ditemukan');
    if (receiving.status === ReceivingStatus.COMPLETED) {
      throw new BadRequestException('Goods Receiving sudah dikonfirmasi');
    }

    const qtyMap = new Map(dto.items.map((i) => [i.id, i.qtyReceived]));
    let hasDiscrepancy = false;
    let isPartial = false;

    const updates = receiving.items.map((item) => {
      const qtyReceived = qtyMap.get(item.id) ?? item.qtyReceived;
      if (qtyReceived < item.qtyOrdered) isPartial = true;
      const discrepancyPct =
        item.qtyOrdered > 0
          ? Number((((item.qtyOrdered - qtyReceived) / item.qtyOrdered) * 100).toFixed(2))
          : 0;
      if (discrepancyPct > 5) hasDiscrepancy = true;
      return { item, qtyReceived, discrepancyPct };
    });

    const newStatus = isPartial ? ReceivingStatus.PARTIAL : ReceivingStatus.COMPLETED;

    await this.prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.goodsReceivingItem.update({
          where: { id: u.item.id },
          data: { qtyReceived: u.qtyReceived, discrepancyPct: u.discrepancyPct },
        });

        await tx.stockLevel.upsert({
          where: { productId_unitId: { productId: u.item.productId, unitId: receiving.unitId } },
          update: { qty: { increment: u.qtyReceived } },
          create: { productId: u.item.productId, unitId: receiving.unitId, qty: u.qtyReceived },
        });

        if (u.discrepancyPct > 5) {
          await tx.auditLog.create({
            data: {
              userId: user.sub,
              action: 'DISCREPANCY_ALERT',
              entity: 'GoodsReceivingItem',
              entityId: u.item.id,
              after: { discrepancyPct: u.discrepancyPct },
            },
          });
        }
      }

      await tx.goodsReceiving.update({
        where: { id },
        data: { status: newStatus, hasDiscrepancy },
      });

      await tx.purchaseOrder.update({
        where: { id: receiving.poId },
        data: { status: isPartial ? POStatus.PARTIAL : POStatus.COMPLETED },
      });
    });

    if (hasDiscrepancy) {
      await NotificationHelper.send({
        title: 'Selisih penerimaan terdeteksi',
        body: `Receiving ${receiving.id} memiliki item selisih > 5%`,
        type: 'WARNING',
        data: { receivingId: id },
      });
    }

    return this.findOne(id);
  }
}
