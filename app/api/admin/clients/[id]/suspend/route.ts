import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { adminId } = guard;

  const client = await prisma.user.findFirst({ where: { id: params.id, role: "CLIENT" } });
  if (!client) return apiError(ErrorCodes.CLIENT_NOT_FOUND, "Client introuvable", 404);

  if (client.isSuspended) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Ce compte est déjà suspendu", 400);
  }

  await prisma.$transaction(async (tx) => {
    // Suspend account + invalidate all sessions
    await tx.user.update({
      where: { id: params.id },
      data: {
        isSuspended: true,
        tokenVersion: { increment: 1 },
      },
    });
    // Also suspend all active services
    await tx.service.updateMany({
      where: { userId: params.id, status: "ACTIVE" },
      data: { status: "SUSPENDED" },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "CLIENT_SUSPENDED",
        entity: "User",
        entityId: params.id,
        meta: { email: client.email },
      },
    });
  });

  return apiSuccess({ suspended: true });
}
