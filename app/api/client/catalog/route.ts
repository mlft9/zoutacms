import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    include: {
      plans: {
        where: { isActive: true },
        orderBy: { priceMonthly: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          priceMonthly: true,
          priceQuarterly: true,
          priceAnnual: true,
          isActive: true,
          // provisionConfig volontairement exclu (données internes)
        },
      },
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
