import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const configSchema = z.object({
  panelEnabled: z.boolean().optional(),
  discordEnabled: z.boolean().optional(),
  discordWebhook: z.string().url("URL invalide").optional().nullable(),
});

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const config = await prisma.alertConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return NextResponse.json({ success: true, data: config });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: parsed.error.errors[0].message } },
      { status: 400 }
    );
  }

  const config = await prisma.alertConfig.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  return NextResponse.json({ success: true, data: config });
}
