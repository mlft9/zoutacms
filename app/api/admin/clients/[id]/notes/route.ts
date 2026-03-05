import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createNoteSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const notes = await prisma.adminNote.findMany({
    where: { userId: params.id },
    select: {
      id: true,
      content: true,
      createdAt: true,
      admin: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(notes);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { adminId } = guard;

  const client = await prisma.user.findFirst({ where: { id: params.id, role: "CLIENT" } });
  if (!client) return apiError(ErrorCodes.CLIENT_NOT_FOUND, "Client introuvable", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Corps de requête invalide");
  }

  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, parsed.error.errors[0].message);
  }

  const note = await prisma.adminNote.create({
    data: {
      content: parsed.data.content,
      userId: params.id,
      adminId,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      admin: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return apiSuccess(note, 201);
}
