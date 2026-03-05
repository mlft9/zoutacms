import { NextRequest } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { isSetupComplete } from "@/lib/setup";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";

export const runtime = "nodejs";

const schema = z.object({
  url: z.string().url("URL invalide").startsWith("postgresql", "L'URL doit commencer par postgresql://"),
});

export async function POST(req: NextRequest) {
  if (isSetupComplete()) {
    return apiError(ErrorCodes.FORBIDDEN, "Le setup est déjà terminé", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      parsed.error.issues[0]?.message ?? "Données invalides",
    );
  }

  const { url } = parsed.data;

  // Test connection with a temporary Prisma client
  const testClient = new PrismaClient({ datasources: { db: { url } } });

  try {
    await testClient.$connect();
    await testClient.$disconnect();
    return apiSuccess({ connected: true });
  } catch (err) {
    await testClient.$disconnect().catch(() => {});
    const message = err instanceof Error ? err.message : "Connexion impossible";
    return apiError(ErrorCodes.INTERNAL_ERROR, `Connexion échouée : ${message}`);
  }
}
