import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { updateServiceSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const service = await prisma.service.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      config: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  if (!service) return apiError(ErrorCodes.SERVICE_NOT_FOUND, "Service introuvable", 404);
  return apiSuccess(service);
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

  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, parsed.error.errors[0].message);
  }

  const existing = await prisma.service.findUnique({ where: { id: params.id } });
  if (!existing) return apiError(ErrorCodes.SERVICE_NOT_FOUND, "Service introuvable", 404);

  const updated = await prisma.$transaction(async (tx) => {
    const service = await tx.service.update({
      where: { id: params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: parsed.data as any,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        config: true,
        updatedAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "SERVICE_UPDATED",
        entity: "Service",
        entityId: params.id,
        meta: { name: parsed.data.name, status: parsed.data.status } as Prisma.InputJsonValue,
      },
    });
    return service;
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

  const existing = await prisma.service.findUnique({ where: { id: params.id } });
  if (!existing) return apiError(ErrorCodes.SERVICE_NOT_FOUND, "Service introuvable", 404);

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "SERVICE_DELETED",
        entity: "Service",
        entityId: params.id,
        meta: { name: existing.name, type: existing.type },
      },
    });
    await tx.service.delete({ where: { id: params.id } });
  });

  return apiSuccess({ deleted: true });
}
