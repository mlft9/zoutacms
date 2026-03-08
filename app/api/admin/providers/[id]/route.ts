import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { config, ...rest } = parsed.data;
  const prov = await prisma.providerConfig.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(config !== undefined ? { config: config as never } : {}),
    },
  });

  return NextResponse.json(prov);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  await prisma.providerConfig.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
