import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createServiceSchema } from "@/lib/validations";
import { provisionService } from "@/lib/provisioning";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const search = searchParams.get("search")?.trim() ?? "";
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Prisma.ServiceWhereInput = {
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(type ? { type: type as "VPS" | "MINECRAFT" } : {}),
    ...(status ? { status: status as "ACTIVE" | "SUSPENDED" | "PENDING" | "TERMINATED" } : {}),
  };

  const [total, services] = await Promise.all([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return apiSuccess({
    services,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { adminId } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Corps de requête invalide");
  }

  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, parsed.error.errors[0].message);
  }

  const client = await prisma.user.findFirst({
    where: { id: parsed.data.userId, role: "CLIENT" },
  });
  if (!client) return apiError(ErrorCodes.CLIENT_NOT_FOUND, "Client introuvable", 404);

  // Optionally attach a provider if specified
  const providerId = (parsed.data as { providerId?: string }).providerId ?? null;
  if (providerId) {
    const prov = await prisma.providerConfig.findUnique({ where: { id: providerId } });
    if (!prov) return apiError(ErrorCodes.VALIDATION_ERROR, "Provider introuvable", 404);
  }

  const service = await prisma.$transaction(async (tx) => {
    const newService = await tx.service.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        status: providerId ? "PENDING" : parsed.data.status,
        config: parsed.data.config as Prisma.InputJsonValue,
        userId: parsed.data.userId,
        ...(providerId ? { providerId } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        config: true,
        createdAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "SERVICE_CREATED",
        entity: "Service",
        entityId: newService.id,
        meta: { name: parsed.data.name, type: parsed.data.type, clientId: parsed.data.userId },
      },
    });
    return newService;
  });

  // If provider attached, trigger provisioning asynchronously
  if (providerId) {
    provisionService(service.id).catch(console.error);
  }

  return apiSuccess(service, 201);
}
