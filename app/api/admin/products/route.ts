import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      plans: { orderBy: { createdAt: "asc" } },
    },
  });

  const serialized = products.map((p) => ({
    ...p,
    plans: p.plans.map((pl) => ({
      ...pl,
      priceMonthly: pl.priceMonthly.toString(),
      priceQuarterly: pl.priceQuarterly?.toString() ?? null,
      priceAnnual: pl.priceAnnual?.toString() ?? null,
    })),
  }));

  return NextResponse.json({ success: true, data: serialized });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: "Données invalides", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
    },
    include: {
      plans: true,
    },
  });

  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
