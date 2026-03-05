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

  if (!client.isSuspended) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Ce compte n'est pas suspendu", 400);
  }

  await prisma.$transaction(async (tx) => {
    // Reactivate account
    await tx.user.update({
      where: { id: params.id },
      data: { isSuspended: false },
    });
    // Reactivate suspended services
    await tx.service.updateMany({
      where: { userId: params.id, status: "SUSPENDED" },
      data: { status: "ACTIVE" },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "CLIENT_ACTIVATED",
        entity: "User",
        entityId: params.id,
        meta: { email: client.email },
      },
    });
  });

  return apiSuccess({ activated: true });
}
