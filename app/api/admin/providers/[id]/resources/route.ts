import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { createProvider } from "@/lib/providers/registry";
import type { ProviderSlug } from "@/lib/providers/registry";
import type { ProviderConfigData } from "@/lib/providers/types";
import { ProxmoxProvider } from "@/lib/providers/proxmox";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const provider = await prisma.providerConfig.findUnique({ where: { id: params.id } });
  if (!provider) return NextResponse.json({ error: "Provider introuvable" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "templates" | "storage"

  try {
    const plugin = createProvider(provider.provider as ProviderSlug, provider.config as ProviderConfigData);

    if (!(plugin instanceof ProxmoxProvider)) {
      return NextResponse.json({ templates: [], storage: [] });
    }

    if (type === "templates") {
      const templates = await plugin.listVmTemplates();
      return NextResponse.json({ templates });
    }

    if (type === "storage") {
      const storage = await plugin.listStorage();
      return NextResponse.json({ storage });
    }

    return NextResponse.json({ error: "type invalide (templates | storage)" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inconnue" }, { status: 500 });
  }
}
