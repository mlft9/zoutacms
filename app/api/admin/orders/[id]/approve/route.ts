import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { provisionService } from "@/lib/provisioning";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      plan: { include: { product: { select: { name: true } } } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: { message: "Commande introuvable" } },
      { status: 404 }
    );
  }

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { success: false, error: { message: "Seules les commandes payées peuvent être approuvées" } },
      { status: 400 }
    );
  }

  const { plan } = order;
  const provisionConfig = plan.provisionConfig as Record<string, unknown>;

  // Fusion config plan + cloud-init client
  const serviceConfig = {
    ...provisionConfig,
    hostname: order.hostname,
    cipassword: order.rootPassword,
    sshkeys: order.sshKey ?? undefined,
  };

  const service = await prisma.$transaction(async (tx) => {
    const svc = await tx.service.create({
      data: {
        name: order.hostname ?? `${plan.product.name} - ${plan.name}`,
        type: plan.type,
        status: "PENDING",
        config: serviceConfig as never,
        userId: order.userId,
        providerId: plan.providerId ?? null,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "APPROVED", serviceId: svc.id },
    });

    return svc;
  });

  // Provisionnement fire-and-forget
  provisionService(service.id).catch(() => {});

  return NextResponse.json({ success: true, data: { serviceId: service.id } });
}
