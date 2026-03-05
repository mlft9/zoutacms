import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const action = searchParams.get("action")?.trim() ?? "";
  const entity = searchParams.get("entity")?.trim() ?? "";
  const entityId = searchParams.get("entityId")?.trim() ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const where: Prisma.AuditLogWhereInput = {
    // Uniquement les logs avec entity (logs admin, pas les logs sécurité orphelins)
    entity: entity ? { equals: entity } : { not: null },
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    ...(entityId ? { entityId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  try {
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          meta: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return apiSuccess({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch {
    return apiError(ErrorCodes.INTERNAL_ERROR, "Erreur lors de la récupération des logs", 500);
  }
}
