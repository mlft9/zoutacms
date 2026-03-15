import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["VPS", "MINECRAFT"]).default("VPS"),
  providerId: z.string().optional().nullable(),
  priceMonthly: z.number().positive(),
  priceQuarterly: z.number().positive().optional().nullable(),
  priceAnnual: z.number().positive().optional().nullable(),
  provisionConfig: z.record(z.unknown()),
  isActive: z.boolean().optional().default(true),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) {
    return NextResponse.json(
      { success: false, error: { message: "Produit introuvable" } },
      { status: 404 }
    );
  }

  const plans = await prisma.plan.findMany({
    where: { productId: params.id },
    orderBy: { createdAt: "asc" },
    include: {
      provider: { select: { id: true, name: true, provider: true } },
    },
  });

  const serialized = plans.map((pl) => ({
    ...pl,
    priceMonthly: pl.priceMonthly.toString(),
    priceQuarterly: pl.priceQuarterly?.toString() ?? null,
    priceAnnual: pl.priceAnnual?.toString() ?? null,
  }));

  return NextResponse.json({ success: true, data: serialized });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) {
    return NextResponse.json(
      { success: false, error: { message: "Produit introuvable" } },
      { status: 404 }
    );
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: "Données invalides", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.create({
    data: {
      name: parsed.data.name,
      productId: params.id,
      type: parsed.data.type,
      providerId: parsed.data.providerId ?? null,
      priceMonthly: parsed.data.priceMonthly,
      priceQuarterly: parsed.data.priceQuarterly ?? null,
      priceAnnual: parsed.data.priceAnnual ?? null,
      provisionConfig: parsed.data.provisionConfig as never,
      isActive: parsed.data.isActive,
    },
    include: {
      provider: { select: { id: true, name: true, provider: true } },
    },
  });

  const serialized = {
    ...plan,
    priceMonthly: plan.priceMonthly.toString(),
    priceQuarterly: plan.priceQuarterly?.toString() ?? null,
    priceAnnual: plan.priceAnnual?.toString() ?? null,
  };

  return NextResponse.json({ success: true, data: serialized }, { status: 201 });
}
