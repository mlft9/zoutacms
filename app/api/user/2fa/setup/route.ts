import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return apiError(ErrorCodes.UNAUTHORIZED, "Non authentifié.", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true, email: true },
  });

  if (!user) return apiError(ErrorCodes.NOT_FOUND, "Utilisateur introuvable.", 404);

  if (user.totpEnabled) {
    return apiError(
      ErrorCodes.TOTP_ALREADY_ENABLED,
      "Le 2FA est déjà activé sur ce compte.",
      400,
    );
  }

  // Generate a new TOTP secret
  const secret = speakeasy.generateSecret({
    name: `ZoutaCMS (${user.email})`,
    length: 20,
  });

  // Temporarily store the secret encrypted (not yet "enabled") so we can verify it
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      totpSecret: encrypt(secret.base32),
      totpEnabled: false, // not enabled until verified
    },
  });

  // Generate QR code as a data URL
  const qrCode = await QRCode.toDataURL(secret.otpauth_url ?? "");

  return apiSuccess({
    secret: secret.base32,
    qrCode,
  });
}
