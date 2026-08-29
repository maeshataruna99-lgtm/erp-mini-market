import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { POStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaginationHelper } from '../../../common/helpers/pagination.helper';
import { SequenceHelper } from '../../../common/helpers/sequence.helper';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreatePoDto, QueryPoDto } from './dto/po.dto';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class PoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(query: QueryPoDto) {
    const { page, limit, skip } = PaginationHelper.normalize(query.page, query.limit);
    const where: Prisma.PurchaseOrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { items, meta: PaginationHelper.buildMeta(page, limit, total) };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        goodsReceivings: { include: { items: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase Order tidak ditemukan');
    return po;
  }

  async create(dto: CreatePoDto, user: AuthUser) {
    const lastPo = await this.prisma.purchaseOrder.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { poNumber: true },
    });
    const poNumber = SequenceHelper.next('PO', SequenceHelper.parseLastSequence(lastPo?.poNumber));

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: dto.supplierId,
        createdById: user.sub,
        notes: dto.notes ?? null,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            qtyOrder: item.qtyOrder,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });
  }

  async submit(id: string, user: AuthUser) {
    const po = await this.findOne(id);
    this.assertCanEdit(po, user);
    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('Hanya PO dengan status DRAFT yang bisa disubmit');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.PENDING_APPROVAL },
    });
  }

  async approve(id: string, user: AuthUser) {
    const po = await this.findOne(id);
    if (po.status !== POStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Hanya PO dengan status PENDING_APPROVAL yang bisa diapprove');
    }
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.APPROVED, approvedById: user.sub },
    });
    await this.auditLog.log(
      user.sub,
      'PO_APPROVED',
      'PurchaseOrder',
      id,
      { status: po.status },
      { status: updated.status },
    );
    return updated;
  }

  async send(id: string, user: AuthUser) {
    const po = await this.findOne(id);
    if (po.status !== POStatus.APPROVED) {
      throw new BadRequestException('Hanya PO dengan status APPROVED yang bisa dikirim');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.SENT, sentAt: new Date() },
    });
  }

  async cancel(id: string, user: AuthUser) {
    const po = await this.findOne(id);
    this.assertCanEdit(po, user);
    const allowed: POStatus[] = [POStatus.DRAFT, POStatus.PENDING_APPROVAL];
    if (!allowed.includes(po.status)) {
      throw new BadRequestException('PO hanya bisa dibatalkan saat DRAFT atau PENDING_APPROVAL');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.CANCELLED },
    });
  }

  async remove(id: string, user: AuthUser) {
    const po = await this.findOne(id);
    this.assertCanEdit(po, user);
    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('Hanya PO dengan status DRAFT yang bisa dihapus');
    }
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { message: 'PO berhasil dihapus' };
  }

  private assertCanEdit(po: { createdById: string }, user: AuthUser) {
    const isManager = user.role === Role.ADMIN || user.role === Role.MANAGER;
    if (!isManager && po.createdById !== user.sub) {
      throw new ForbiddenException('Hanya pembuat PO atau MANAJER yang dapat mengubah PO ini');
    }
  }
}
