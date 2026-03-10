import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { createProvider } from "@/lib/providers/registry";
import type { ProviderSlug } from "@/lib/providers/registry";
import type { ProviderConfigData } from "@/lib/providers/types";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const provConfig = await prisma.providerConfig.findUnique({ where: { id: params.id } });
  if (!provConfig) return NextResponse.json({ error: "Provider introuvable" }, { status: 404 });

  try {
    const provider = createProvider(
      provConfig.provider as ProviderSlug,
      provConfig.config as ProviderConfigData
    );
    const result = await provider.testConnection();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : "Erreur inconnue",
    });
  }
}
