import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isSetupDone, saveSetupProgress, getSetupProgress } from "@/lib/setup";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { registerSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (await isSetupDone()) {
    return apiError(ErrorCodes.FORBIDDEN, "Le setup est déjà terminé", 403);
  }

  // Safety check: if an admin already exists, refuse
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (existingAdmin) {
    return apiError(ErrorCodes.CONFLICT, "Un compte administrateur existe déjà");
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      firstError?.message ?? "Données invalides",
    );
  }

  const { email, password, firstName, lastName } = parsed.data;

  const hashedPassword = await hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      role: "ADMIN",
    },
  });

  await prisma.auditLog.create({
    data: { userId: newUser.id, action: "ADMIN_CREATED_VIA_SETUP" },
  });

  const progress = getSetupProgress();
  saveSetupProgress({ ...progress, step: 4 });

  return apiSuccess({ created: true });
}
