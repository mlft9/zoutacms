import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { randomBytes } from "crypto";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { adminId } = guard;

  const client = await prisma.user.findFirst({
    where: { id: params.id, role: "CLIENT" },
    select: { id: true, email: true, firstName: true },
  });

  if (!client) return apiError(ErrorCodes.CLIENT_NOT_FOUND, "Client introuvable", 404);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.$transaction(async (tx) => {
    // Invalidate previous tokens
    await tx.passwordReset.updateMany({
      where: { userId: client.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordReset.create({
      data: { userId: client.id, token, expiresAt },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "CLIENT_PASSWORD_RESET_SENT",
        entity: "User",
        entityId: params.id,
        meta: { email: client.email },
      },
    });
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  sendEmail({
    ...passwordResetEmail(resetUrl, client.firstName ?? undefined),
    to: client.email,
  }).catch(console.error);

  return apiSuccess({ sent: true });
}
