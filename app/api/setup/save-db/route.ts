import { NextRequest } from "next/server";
import { z } from "zod";
import { isSetupComplete, saveDatabaseUrl, saveSetupProgress, getSetupProgress } from "@/lib/setup";
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
  const currentUrl = process.env.DATABASE_URL ?? "";
  const isChanged = url !== currentUrl;

  saveDatabaseUrl(url);

  const progress = getSetupProgress();
  saveSetupProgress({ ...progress, dbChanged: isChanged });

  return apiSuccess({
    saved: true,
    requiresRestart: isChanged,
  });
}
