import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { invoices: true, service: true },
  });
  if (!order) {
    return NextResponse.json(
      { success: false, error: { message: "Commande introuvable" } },
      { status: 404 }
    );
  }

  if (order.invoices.length > 0) {
    return NextResponse.json(
      { success: false, error: { message: "Impossible de supprimer une commande ayant des factures associées" } },
      { status: 400 }
    );
  }

  // Cascade: delete service if exists, then order
  await prisma.$transaction(async (tx) => {
    if (order.service) {
      await tx.service.delete({ where: { id: order.service.id } });
    }
    await tx.order.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ success: true });
}
