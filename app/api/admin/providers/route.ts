import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  provider: z.enum(["proxmox"]),
  name: z.string().min(1),
  config: z.record(z.unknown()),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const providers = await prisma.providerConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(providers);
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const prov = await prisma.providerConfig.create({
    data: {
      provider: parsed.data.provider,
      name: parsed.data.name,
      config: parsed.data.config as never,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json(prov, { status: 201 });
}
