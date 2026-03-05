import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSetupDone, saveSetupProgress, getSetupProgress } from "@/lib/setup";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";

export const runtime = "nodejs";

const schema = z.object({
  platformName: z.string().min(1, "Nom requis").max(100, "Nom trop long"),
  platformUrl: z.string().url("URL invalide").optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  if (await isSetupDone()) {
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

  const { platformName, platformUrl } = parsed.data;

  // Upsert — there should only ever be one SystemSettings row
  await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: {
      platformName,
      platformUrl: platformUrl || null,
    },
    create: {
      id: "singleton",
      platformName,
      platformUrl: platformUrl || null,
    },
  });

  const progress = getSetupProgress();
  saveSetupProgress({ ...progress, step: 3 });

  return apiSuccess({ saved: true });
}
