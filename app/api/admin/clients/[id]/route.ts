import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { updateClientSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const client = await prisma.user.findFirst({
    where: { id: params.id, role: "CLIENT" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      totpEnabled: true,
      isSuspended: true,
      createdAt: true,
      updatedAt: true,
      services: {
        select: { id: true, name: true, type: true, status: true, config: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      clientNotes: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          admin: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      loginAttempts: {
        select: { id: true, ip: true, success: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });

  if (!client) return apiError(ErrorCodes.CLIENT_NOT_FOUND, "Client introuvable", 404);

  // Fetch audit logs related to this client separately
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: params.id },
    select: {
      id: true,
      action: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return apiSuccess({ ...client, auditLogs });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { adminId } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Corps de requête invalide");
  }

  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, parsed.error.errors[0].message);
  }

  const existing = await prisma.user.findFirst({ where: { id: params.id, role: "CLIENT" } });
  if (!existing) return apiError(ErrorCodes.CLIENT_NOT_FOUND, "Client introuvable", 404);

  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) return apiError(ErrorCodes.EMAIL_ALREADY_EXISTS, "Email déjà utilisé", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, email: true, firstName: true, lastName: true, updatedAt: true },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "CLIENT_UPDATED",
        entity: "User",
        entityId: params.id,
        meta: parsed.data,
      },
    });
    return user;
  });

  return apiSuccess(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { adminId } = guard;

  const existing = await prisma.user.findFirst({ where: { id: params.id, role: "CLIENT" } });
  if (!existing) return apiError(ErrorCodes.CLIENT_NOT_FOUND, "Client introuvable", 404);

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "CLIENT_DELETED",
        entity: "User",
        entityId: params.id,
        meta: { email: existing.email },
      },
    });
    await tx.user.delete({ where: { id: params.id } });
  });

  return apiSuccess({ deleted: true });
}
