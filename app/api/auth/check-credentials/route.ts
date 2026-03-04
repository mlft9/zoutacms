import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-response";
import {
  checkRateLimit,
  recordFailedAttempt,
} from "@/lib/rate-limit";

const checkSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  loginType: z.enum(["client", "admin"]).default("client"),
});

/**
 * POST /api/auth/check-credentials
 *
 * Pre-validates email + password and returns whether 2FA is required.
 * This avoids relying on NextAuth's error message relay (which is unreliable
 * for custom error codes thrown from the authorize function).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Données invalides.",
        400,
      );
    }

    const { email, password, loginType } = parsed.data;

    // Rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const rl = checkRateLimit(ip, 5, 10, 15 * 60 * 1000);
    if (!rl.success) {
      return apiError(
        ErrorCodes.RATE_LIMITED,
        "Trop de tentatives. Réessayez dans quelques minutes.",
        429,
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      recordFailedAttempt(ip);
      return apiError(
        ErrorCodes.INVALID_CREDENTIALS,
        "Email ou mot de passe incorrect.",
        401,
      );
    }

    const passwordValid = await compare(password, user.password);
    if (!passwordValid) {
      recordFailedAttempt(ip);
      return apiError(
        ErrorCodes.INVALID_CREDENTIALS,
        "Email ou mot de passe incorrect.",
        401,
      );
    }

    // Admin portal: only ADMIN accounts allowed
    // Return same error as invalid credentials to avoid user enumeration
    if (loginType === "admin" && user.role !== "ADMIN") {
      recordFailedAttempt(ip);
      return apiError(
        ErrorCodes.INVALID_CREDENTIALS,
        "Email ou mot de passe incorrect.",
        401,
      );
    }

    // Return whether 2FA is required
    return apiSuccess({
      requires2FA: !!(user.totpEnabled && user.totpSecret),
    });
  } catch {
    return apiError(
      ErrorCodes.INTERNAL_ERROR,
      "Une erreur interne est survenue.",
      500,
    );
  }
}
