import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { getIpFromRequest } from "@/lib/utils";
import { sendEmail, passwordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = getIpFromRequest(req);

  // Strict rate limiting: max 3 per hour per IP
  const rl = await checkRateLimit(ip, 3, 10, 60 * 60 * 1000);
  if (!rl.success) {
    await recordFailedAttempt(ip);
    return apiError(
      ErrorCodes.RATE_LIMITED,
      `Trop de tentatives. Réessayez plus tard.`,
      429,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Corps de requête invalide.");
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Email invalide.");
  }

  const { email } = parsed.data;

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate previous tokens
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    sendEmail({
      ...passwordResetEmail(resetUrl, user.firstName ?? undefined),
      to: email,
    }).catch(console.error);
  }

  // Always return the same response
  return apiSuccess({
    message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
  });
}
