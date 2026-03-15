import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: status ? { status: status as "AWAITING_PAYMENT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      plan: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
      service: { select: { id: true, name: true, status: true } },
    },
  });

  const serialized = orders.map((o) => ({
    ...o,
    plan: {
      ...o.plan,
      priceMonthly: o.plan.priceMonthly.toString(),
      priceQuarterly: o.plan.priceQuarterly?.toString() ?? null,
      priceAnnual: o.plan.priceAnnual?.toString() ?? null,
    },
  }));

  return NextResponse.json({ success: true, data: serialized });
}
