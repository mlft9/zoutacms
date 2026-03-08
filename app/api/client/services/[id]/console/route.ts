import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProvider } from "@/lib/providers/registry";
import type { ProviderSlug } from "@/lib/providers/registry";
import type { ProviderConfigData } from "@/lib/providers/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const service = await prisma.service.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { provider: true },
  });

  if (!service) return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  if (!service.externalId || !service.provider) {
    return NextResponse.json({ error: "Console non disponible" }, { status: 400 });
  }

  try {
    const plugin = createProvider(
      service.provider.provider as ProviderSlug,
      service.provider.config as ProviderConfigData
    );
    const url = await plugin.getConsoleUrl(service.externalId);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur console" },
      { status: 500 }
    );
  }
}
