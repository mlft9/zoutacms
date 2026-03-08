import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { createProvider } from "@/lib/providers/registry";
import type { ProviderSlug } from "@/lib/providers/registry";
import type { ProviderConfigData } from "@/lib/providers/types";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const provConfig = await prisma.providerConfig.findUnique({ where: { id: params.id } });
  if (!provConfig) return NextResponse.json({ error: "Provider introuvable" }, { status: 404 });

  try {
    const provider = createProvider(
      provConfig.provider as ProviderSlug,
      provConfig.config as ProviderConfigData
    );
    const ok = await provider.testConnection();
    if (ok) {
      return NextResponse.json({ success: true, message: "Connexion réussie" });
    } else {
      return NextResponse.json({ success: false, message: "Connexion échouée" }, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : "Erreur inconnue",
    });
  }
}
