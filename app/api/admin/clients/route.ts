import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createClientSchema } from "@/lib/validations";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const search = searchParams.get("search")?.trim() ?? "";
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const where = {
    role: "CLIENT" as const,
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, clients] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuspended: true,
        createdAt: true,
        _count: { select: { services: true } },
      },
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return apiSuccess({
    clients,
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

  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, parsed.error.errors[0].message);
  }

  const { email, password, firstName, lastName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return apiError(ErrorCodes.EMAIL_ALREADY_EXISTS, "Un compte avec cet email existe déjà", 409);
  }

  const hashed = await hash(password, 12);

  const client = await prisma.$transaction(async (tx) => {
    const newClient = await tx.user.create({
      data: { email, password: hashed, firstName, lastName, role: "CLIENT" },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "CLIENT_CREATED",
        entity: "User",
        entityId: newClient.id,
        meta: { email, firstName, lastName },
      },
    });
    return newClient;
  });

  return apiSuccess(client, 201);
}
