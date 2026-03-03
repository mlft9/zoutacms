import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Corps de requête invalide.");
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return apiError(ErrorCodes.VALIDATION_ERROR, firstError.message);
  }

  const { token, password } = parsed.data;

  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetRecord) {
    return apiError(ErrorCodes.INVALID_TOKEN, "Token invalide ou inexistant.", 400);
  }

  if (resetRecord.usedAt) {
    return apiError(ErrorCodes.INVALID_TOKEN, "Ce lien a déjà été utilisé.", 400);
  }

  if (resetRecord.expiresAt < new Date()) {
    return apiError(ErrorCodes.TOKEN_EXPIRED, "Ce lien a expiré. Veuillez en demander un nouveau.", 400);
  }

  const hashedPassword = await hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordReset.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return apiSuccess({ message: "Mot de passe réinitialisé avec succès." });
}
