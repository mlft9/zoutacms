import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Non authentifié" } },
      { status: 401 }
    );
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });

  if (!order) {
    return NextResponse.json(
      { success: false, error: { message: "Commande introuvable" } },
      { status: 404 }
    );
  }

  if (order.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { message: "Accès refusé" } },
      { status: 403 }
    );
  }

  if (!["PENDING", "AWAITING_PAYMENT"].includes(order.status)) {
    return NextResponse.json(
      { success: false, error: { message: "Cette commande ne peut pas être annulée" } },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });
    await tx.invoice.updateMany({
      where: { orderId: params.id, status: { in: ["PENDING"] } },
      data: { status: "CANCELLED" },
    });
  });

  return NextResponse.json({ success: true });
}
