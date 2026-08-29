import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OpnameStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { BlindCountDto, CreateOpnameSessionDto } from './dto/opname.dto';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class OpnameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(query: { page?: number; limit?: number; status?: OpnameStatus }) {
    const page = query.page && query.page > 0 ? Math.floor(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(Math.floor(query.limit), 100) : 20;

    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.stockOpnameSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.stockOpnameSession.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const session = await this.prisma.stockOpnameSession.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
      },
    });
    if (!session) throw new NotFoundException('Sesi opname tidak ditemukan');
    return session;
  }

  async create(dto: CreateOpnameSessionDto, user: AuthUser) {
    return this.prisma.stockOpnameSession.create({
      data: {
        unitId: dto.unitId,
        scope: dto.scope ?? null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
        createdById: user.sub,
      },
      include: { items: true },
    });
  }

  async start(id: string, user: AuthUser) {
    const session = await this.findOne(id);
    if (session.status !== OpnameStatus.SCHEDULED) {
      throw new BadRequestException('Sesi sudah dimulai atau selesai');
    }

    const products = await this.prisma.product.findMany({
      where: session.scope && session.scope !== 'ALL' ? { category: session.scope } : {},
      select: { id: true },
    });

    await this.prisma.stockOpnameItem.createMany({
      data: products.map((p) => ({
        sessionId: id,
        productId: p.id,
        qtySystem: 0,
        qtyPhysical: 0,
        countedById: user.sub,
      })),
      skipDuplicates: true,
    });

    return this.prisma.stockOpnameSession.update({
      where: { id },
      data: { status: OpnameStatus.IN_PROGRESS },
    });
  }

  async blindCount(id: string, dto: BlindCountDto, user: AuthUser) {
    const session = await this.findOne(id);
    if (session.status !== OpnameStatus.IN_PROGRESS) {
      throw new BadRequestException('Sesi opname belum IN_PROGRESS');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const existing = await tx.stockOpnameItem.findUnique({
          where: {
            sessionId_productId: { sessionId: id, productId: item.productId },
          },
        });
        if (existing) {
          await tx.stockOpnameItem.update({
            where: { id: existing.id },
            data: { qtyPhysical: item.qtyPhysical, reason: item.reason ?? null, countedById: user.sub },
          });
        } else {
          await tx.stockOpnameItem.create({
            data: {
              sessionId: id,
              productId: item.productId,
              qtySystem: 0,
              qtyPhysical: item.qtyPhysical,
              reason: item.reason ?? null,
              countedById: user.sub,
            },
          });
        }
      }
    });

    return this.findOne(id);
  }

  async reconcile(id: string, user: AuthUser) {
    const session = await this.findOne(id);
    const allowed: OpnameStatus[] = [OpnameStatus.IN_PROGRESS, OpnameStatus.SCHEDULED];
    if (!allowed.includes(session.status)) {
      throw new BadRequestException('Sesi opname tidak bisa direconcile');
    }

    await this.prisma.$transaction(async (tx) => {
      const items = await tx.stockOpnameItem.findMany({ where: { sessionId: id } });
      for (const item of items) {
        const stock = await tx.stockLevel.findUnique({
          where: { productId_unitId: { productId: item.productId, unitId: session.unitId } },
        });
        const qtySystem = stock?.qty ?? 0;
        const variance = item.qtyPhysical - qtySystem;

        await tx.stockOpnameItem.update({
          where: { id: item.id },
          data: { qtySystem, variance },
        });

        if (variance !== 0) {
          const adjusted = await tx.stockLevel.upsert({
            where: { productId_unitId: { productId: item.productId, unitId: session.unitId } },
            update: { qty: item.qtyPhysical },
            create: { productId: item.productId, unitId: session.unitId, qty: item.qtyPhysical },
          });
          await this.auditLog.log(
            item.countedById,
            'STOCK_ADJUSTMENT',
            'StockLevel',
            adjusted.id,
            { qty: qtySystem },
            { qty: item.qtyPhysical, reason: item.reason ?? null },
          );
        }
      }

      await tx.stockOpnameSession.update({
        where: { id },
        data: { status: OpnameStatus.RECONCILED },
      });
    });

    await this.auditLog.log(
      user.sub,
      'OPNAME_RECONCILED',
      'StockOpnameSession',
      id,
      { status: session.status },
      { status: OpnameStatus.RECONCILED },
    );

    return this.findOne(id);
  }

  async close(id: string) {
    const session = await this.findOne(id);
    if (session.status !== OpnameStatus.RECONCILED) {
      throw new BadRequestException('Sesi harus RECONCILED sebelum ditutup');
    }
    return this.prisma.stockOpnameSession.update({
      where: { id },
      data: { status: OpnameStatus.CLOSED },
    });
  }
}
