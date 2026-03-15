import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  productId: z.string().optional(),
  type: z.enum(["VPS", "MINECRAFT"]).optional(),
  providerId: z.string().optional().nullable(),
  priceMonthly: z.number().positive().optional(),
  priceQuarterly: z.number().positive().optional().nullable(),
  priceAnnual: z.number().positive().optional().nullable(),
  provisionConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const plan = await prisma.plan.findUnique({ where: { id: params.id } });
  if (!plan) {
    return NextResponse.json(
      { success: false, error: { message: "Plan introuvable" } },
      { status: 404 }
    );
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: "Données invalides", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const updated = await prisma.plan.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      provisionConfig: parsed.data.provisionConfig as never,
    },
    include: {
      provider: { select: { id: true, name: true, provider: true } },
    },
  });

  const serialized = {
    ...updated,
    priceMonthly: updated.priceMonthly.toString(),
    priceQuarterly: updated.priceQuarterly?.toString() ?? null,
    priceAnnual: updated.priceAnnual?.toString() ?? null,
  };

  return NextResponse.json({ success: true, data: serialized });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const plan = await prisma.plan.findUnique({ where: { id: params.id } });
  if (!plan) {
    return NextResponse.json(
      { success: false, error: { message: "Plan introuvable" } },
      { status: 404 }
    );
  }

  const ordersCount = await prisma.order.count({ where: { planId: params.id } });
  if (ordersCount > 0) {
    await prisma.plan.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true, data: { deactivated: true } });
  }

  await prisma.plan.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, data: { deleted: true } });
}
