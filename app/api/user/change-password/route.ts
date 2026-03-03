import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { compare, hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations";
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

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return apiError(ErrorCodes.VALIDATION_ERROR, firstError.message);
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user) return apiError(ErrorCodes.NOT_FOUND, "Utilisateur introuvable.", 404);

  const isValid = await compare(currentPassword, user.password);
  if (!isValid) {
    return apiError(
      ErrorCodes.PASSWORD_INCORRECT,
      "Le mot de passe actuel est incorrect.",
      400,
    );
  }

  const hashedPassword = await hash(newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  return apiSuccess({ message: "Mot de passe modifié avec succès." });
}
