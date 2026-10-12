import { prisma } from './prisma';

export interface AuditLogParams {
  organizationId: string;
  userId?: string;
  entity: string;
  entityId: string;
  action: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
}

export async function logAudit(params: AuditLogParams) {
  try {
    let validUserId = params.userId;
    if (validUserId) {
      const u = await prisma.user.findFirst({
        where: { OR: [{ id: validUserId }, { email: validUserId }] },
        select: { id: true },
      });
      validUserId = u ? u.id : undefined;
    }

    return await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: validUserId,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        previousData: params.previousData ? JSON.parse(JSON.stringify(params.previousData)) : null,
        newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : null,
        ipAddress: params.ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
