import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const order = await prisma.order.findUnique({ where: { id: params.id } });

  if (!order) {
    return NextResponse.json(
      { success: false, error: { message: "Commande introuvable" } },
      { status: 404 }
    );
  }

  if (!["PENDING", "AWAITING_PAYMENT"].includes(order.status)) {
    return NextResponse.json(
      { success: false, error: { message: "Cette commande ne peut pas être rejetée" } },
      { status: 400 }
    );
  }

  let body: { reason?: string } = {};
  try {
    body = schema.parse(await req.json());
  } catch {
    // body optionnel
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        notes: body.reason ? `Rejet : ${body.reason}` : order.notes,
      },
    });

    // Annuler la/les factures liées
    await tx.invoice.updateMany({
      where: { orderId: params.id, status: { in: ["PENDING"] } },
      data: { status: "CANCELLED" },
    });
  });

  return NextResponse.json({ success: true });
}
