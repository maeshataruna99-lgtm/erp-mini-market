import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MutationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaginationHelper } from '../../../common/helpers/pagination.helper';
import { SequenceHelper } from '../../../common/helpers/sequence.helper';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateMutationDto } from './dto/mutation.dto';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class MutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(query: { page?: number; limit?: number; status?: MutationStatus; search?: string }) {
    const { page, limit, skip } = PaginationHelper.normalize(query.page, query.limit);
    const where: Prisma.StockMutationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { mutationNumber: { contains: query.search, mode: 'insensitive' } },
              { fromUnit: { name: { contains: query.search, mode: 'insensitive' } } },
              { toUnit: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMutation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromUnit: { select: { id: true, name: true } },
          toUnit: { select: { id: true, name: true } },
          requestedBy: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.stockMutation.count({ where }),
    ]);

    return { items, meta: PaginationHelper.buildMeta(page, limit, total) };
  }

  async findOne(id: string) {
    const mutation = await this.prisma.stockMutation.findUnique({
      where: { id },
      include: {
        fromUnit: true,
        toUnit: true,
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
      },
    });
    if (!mutation) throw new NotFoundException('Mutasi tidak ditemukan');
    return mutation;
  }

  async create(dto: CreateMutationDto, user: AuthUser) {
    if (dto.fromUnitId === dto.toUnitId) {
      throw new BadRequestException('Unit asal dan tujuan tidak boleh sama');
    }

    const lastMutation = await this.prisma.stockMutation.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { mutationNumber: true },
    });
    const mutationNumber = SequenceHelper.next(
      'MUT',
      SequenceHelper.parseLastSequence(lastMutation?.mutationNumber),
    );

    return this.prisma.stockMutation.create({
      data: {
        mutationNumber,
        fromUnitId: dto.fromUnitId,
        toUnitId: dto.toUnitId,
        requestedById: user.sub,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
          })),
        },
      },
      include: { items: true },
    });
  }

  async approve(id: string, user: AuthUser) {
    const mutation = await this.findOne(id);
    this.assertStatus(mutation.status, [MutationStatus.REQUESTED]);
    const updated = await this.prisma.stockMutation.update({
      where: { id },
      data: { status: MutationStatus.APPROVED, approvedById: user.sub },
    });
    await this.auditLog.log(
      user.sub,
      'MUTATION_APPROVED',
      'StockMutation',
      id,
      { status: mutation.status },
      { status: updated.status },
    );
    return updated;
  }

  async reject(id: string, _user: AuthUser) {
    const mutation = await this.findOne(id);
    this.assertStatus(mutation.status, [MutationStatus.REQUESTED]);
    return this.prisma.stockMutation.update({
      where: { id },
      data: { status: MutationStatus.REJECTED },
    });
  }

  async pick(id: string) {
    const mutation = await this.findOne(id);
    this.assertStatus(mutation.status, [MutationStatus.APPROVED]);
    return this.prisma.stockMutation.update({
      where: { id },
      data: { status: MutationStatus.IN_TRANSIT },
    });
  }

  async receive(id: string, user: AuthUser) {
    const mutation = await this.findOne(id);
    this.assertStatus(mutation.status, [MutationStatus.IN_TRANSIT]);

    await this.prisma.$transaction(async (tx) => {
      for (const item of mutation.items) {
        const fromStock = await tx.stockLevel.findUnique({
          where: { productId_unitId: { productId: item.productId, unitId: mutation.fromUnitId } },
        });
        if (!fromStock || fromStock.qty < item.qty) {
          throw new BadRequestException(
            `Stok tidak cukup di unit asal untuk ${item.product.name}`,
          );
        }

        await tx.stockLevel.update({
          where: { id: fromStock.id },
          data: { qty: { decrement: item.qty } },
        });
        await tx.stockLevel.upsert({
          where: { productId_unitId: { productId: item.productId, unitId: mutation.toUnitId } },
          update: { qty: { increment: item.qty } },
          create: { productId: item.productId, unitId: mutation.toUnitId, qty: item.qty },
        });

        await this.auditLog.log(
          user.sub,
          'MUTATION_ITEM_TRANSFERRED',
          'StockMutation',
          id,
          { fromUnitId: mutation.fromUnitId, toUnitId: mutation.toUnitId, qty: item.qty },
          { status: MutationStatus.RECEIVED },
        );
      }

      await tx.stockMutation.update({
        where: { id },
        data: { status: MutationStatus.RECEIVED },
      });
    });

    return this.findOne(id);
  }

  private assertStatus(current: MutationStatus, allowed: MutationStatus[]) {
    if (!allowed.includes(current)) {
      throw new BadRequestException(
        `Status mutasi ${current} tidak mengizinkan aksi ini`,
      );
    }
  }
}
