import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    before?: unknown,
    after?: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        before: before === undefined ? null : JSON.parse(JSON.stringify(before)),
        after: after === undefined ? null : JSON.parse(JSON.stringify(after)),
      },
    });
  }

  findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findRecent(limit = 20) {
    return this.prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
