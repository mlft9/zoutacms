import { prisma } from "@/lib/prisma";

/**
 * Enregistre une action admin dans l'audit log.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action,
      entity,
      entityId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta: meta as any,
    },
  });
}
