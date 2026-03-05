import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import * as speakeasy from "speakeasy";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { totpVerifySchema } from "@/lib/validations";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return apiError(ErrorCodes.UNAUTHORIZED, "Non authentifié.", 401);

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

  if (!user.totpEnabled || !user.totpSecret) {
    return apiError(ErrorCodes.TOTP_NOT_ENABLED, "Le 2FA n'est pas activé sur ce compte.", 400);
  }

  const plainSecret = decrypt(user.totpSecret);

  const verified = speakeasy.totp.verify({
    secret: plainSecret,
    encoding: "base32",
    token: code,
    window: 1,
  });

  if (!verified) {
    return apiError(ErrorCodes.TOTP_INVALID, "Code 2FA invalide.", 400);
  }

  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { totpEnabled: false, totpSecret: null, tokenVersion: { increment: 1 } },
    }),
    prisma.auditLog.create({
      data: { userId: session.user.id, action: "2FA_DISABLED", ip },
    }),
  ]);

  return apiSuccess({ message: "Authentification à deux facteurs désactivée." });
}
