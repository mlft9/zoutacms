import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth-admin";
import { apiError, ErrorCodes } from "@/lib/api-response";

/**
 * Vérifie que la requête provient d'un admin connecté via le portail admin.
 * Utilise adminAuthOptions pour lire le cookie de session admin séparé.
 * Retourne { session, adminId } si OK, ou une NextResponse d'erreur sinon.
 */
export async function requireAdmin() {
  const session = await getServerSession(adminAuthOptions);

  if (!session?.user?.id) {
    return { error: apiError(ErrorCodes.UNAUTHORIZED, "Non authentifié", 401) };
  }

  if (session.user.role !== "ADMIN" || session.user.portal !== "admin") {
    return { error: apiError(ErrorCodes.FORBIDDEN, "Accès réservé aux administrateurs", 403) };
  }

  return { session, adminId: session.user.id };
}
