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

  const client = await prisma.user.findFirst({
    where: { id: params.id, role: "CLIENT" },
    select: { id: true, email: true, totpEnabled: true },
  });

  if (!client) return apiError(ErrorCodes.CLIENT_NOT_FOUND, "Client introuvable", 404);

  if (!client.totpEnabled) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Le 2FA n'est pas activé pour ce client", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: params.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
        tokenVersion: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "CLIENT_2FA_DISABLED_BY_ADMIN",
        entity: "User",
        entityId: params.id,
        meta: { email: client.email },
      },
    });
  });

  return apiSuccess({ disabled: true });
}
