import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: "Données invalides", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) {
    return NextResponse.json(
      { success: false, error: { message: "Produit introuvable" } },
      { status: 404 }
    );
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: parsed.data,
    include: {
      plans: { orderBy: { createdAt: "asc" } },
    },
  });

  const serialized = {
    ...updated,
    plans: updated.plans.map((pl) => ({
      ...pl,
      priceMonthly: pl.priceMonthly.toString(),
      priceQuarterly: pl.priceQuarterly?.toString() ?? null,
      priceAnnual: pl.priceAnnual?.toString() ?? null,
    })),
  };

  return NextResponse.json({ success: true, data: serialized });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { plans: { select: { id: true } } },
  });

  if (!product) {
    return NextResponse.json(
      { success: false, error: { message: "Produit introuvable" } },
      { status: 404 }
    );
  }

  if (product.plans.length > 0) {
    // Soft delete: désactiver si des plans existent
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true, data: { deleted: false, deactivated: true } });
  }

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, data: { deleted: true } });
}
