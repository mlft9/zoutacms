import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import {
  apiSuccess,
  apiError,
  ErrorCodes,
} from "@/lib/api-response";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { getIpFromRequest } from "@/lib/utils";
import { sendEmail, welcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = getIpFromRequest(req);

  // Rate limiting: max 5 registrations per minute per IP
  const rl = checkRateLimit(ip, 5);
  if (!rl.success) {
    recordFailedAttempt(ip);
    return apiError(
      ErrorCodes.RATE_LIMITED,
      `Trop de tentatives. Réessayez dans ${rl.retryAfter ?? 60} secondes.`,
      429,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Corps de requête invalide.");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      fieldErrors[field] = issue.message;
    }
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Données invalides.",
      400,
    );
  }

  const { email, password, firstName, lastName } = parsed.data;

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return apiError(
      ErrorCodes.EMAIL_ALREADY_EXISTS,
      "Un compte avec cet email existe déjà.",
      409,
    );
  }

  // Hash password with bcrypt cost factor 12
  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "CLIENT",
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
  });

  // Send welcome email (non-blocking)
  sendEmail({
    ...welcomeEmail(firstName),
    to: email,
  }).catch(console.error);

  return apiSuccess({ user }, 201);
}
