import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Non authentifié" } },
      { status: 401 }
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      service: { select: { id: true, name: true, type: true } },
      order: { select: { id: true, billingCycle: true } },
    },
  });

  const serialized = invoices.map((inv) => ({
    ...inv,
    amount: inv.amount.toString(),
  }));

  return NextResponse.json({ success: true, data: serialized });
}
