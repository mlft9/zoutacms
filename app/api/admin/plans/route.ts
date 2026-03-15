import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, name: true } },
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
