import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import * as speakeasy from "speakeasy";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { totpVerifySchema } from "@/lib/validations";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError(ErrorCodes.UNAUTHORIZED, "Non authentifié.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Corps de requête invalide.");
  }

  const parsed = totpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Code invalide (6 chiffres requis).");
  }

  const { code } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true, totpEnabled: true },
  });

  if (!user) return apiError(ErrorCodes.NOT_FOUND, "Utilisateur introuvable.", 404);

  if (user.totpEnabled) {
    return apiError(ErrorCodes.TOTP_ALREADY_ENABLED, "Le 2FA est déjà activé.", 400);
  }

  if (!user.totpSecret) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Aucun secret 2FA trouvé. Veuillez relancer la configuration.",
      400,
    );
  }

  const verified = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token: code,
    window: 1,
  });

  if (!verified) {
    return apiError(ErrorCodes.TOTP_INVALID, "Code 2FA invalide. Vérifiez l'heure de votre appareil.", 400);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: true },
  });

  return apiSuccess({ message: "Authentification à deux facteurs activée avec succès." });
}
