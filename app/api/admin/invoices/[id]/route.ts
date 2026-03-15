import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  status: z.enum(["PAID", "CANCELLED", "OVERDUE", "PENDING", "EXPIRED"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { order: true },
  });
  if (!invoice) {
    return NextResponse.json(
      { success: false, error: { message: "Facture introuvable" } },
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

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        paidAt: parsed.data.status === "PAID" ? new Date() : invoice.paidAt,
      },
    });

    // Quand la facture est payée, la commande passe en PENDING (attente validation admin)
    if (parsed.data.status === "PAID" && invoice.orderId && invoice.order?.status === "AWAITING_PAYMENT") {
      await tx.order.update({
        where: { id: invoice.orderId },
        data: { status: "PENDING" },
      });
    }

    return inv;
  });

  return NextResponse.json({
    success: true,
    data: { ...updated, amount: updated.amount.toString() },
  });
}
