import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; noteId: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const note = await prisma.adminNote.findFirst({
    where: { id: params.noteId, userId: params.id },
  });
  if (!note) return apiError(ErrorCodes.NOTE_NOT_FOUND, "Note introuvable", 404);

  await prisma.adminNote.delete({ where: { id: params.noteId } });

  return apiSuccess({ deleted: true });
}
