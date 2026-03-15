import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]).default("MONTHLY"),
  hostname: z.string().min(2).max(63).regex(/^[a-zA-Z0-9-]+$/, "Hostname invalide (lettres, chiffres, tirets)"),
  rootPassword: z.string().min(8, "Mot de passe minimum 8 caractères"),
  sshKey: z.string().optional(),
  notes: z.string().optional(),
});

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Non authentifié" } },
      { status: 401 }
    );
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      plan: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
      service: { select: { id: true, name: true, status: true } },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, amount: true, dueDate: true },
      },
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
    invoices: o.invoices.map((inv) => ({ ...inv, amount: inv.amount.toString() })),
  }));

  return NextResponse.json({ success: true, data: serialized });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Non authentifié" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: "Données invalides", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.findUnique({
    where: { id: parsed.data.planId },
    include: { product: { select: { name: true, isActive: true } } },
  });

  if (!plan || !plan.isActive || !plan.product.isActive) {
    return NextResponse.json(
      { success: false, error: { message: "Plan indisponible" } },
      { status: 400 }
    );
  }

  // Calcul du montant selon le cycle de facturation
  let amount: string;
  if (parsed.data.billingCycle === "QUARTERLY" && plan.priceQuarterly) {
    amount = plan.priceQuarterly.toString();
  } else if (parsed.data.billingCycle === "ANNUAL" && plan.priceAnnual) {
    amount = plan.priceAnnual.toString();
  } else {
    amount = plan.priceMonthly.toString();
  }

  const invoiceNumber = await generateInvoiceNumber();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: session.user.id,
        planId: parsed.data.planId,
        billingCycle: parsed.data.billingCycle,
        status: "AWAITING_PAYMENT",
        hostname: parsed.data.hostname,
        rootPassword: parsed.data.rootPassword,
        sshKey: parsed.data.sshKey ?? null,
        notes: parsed.data.notes ?? null,
        expiresAt,
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        userId: session.user.id,
        orderId: order.id,
        amount,
        status: "PENDING",
        dueDate: expiresAt,
        description: `${plan.product.name} - ${plan.name} (${parsed.data.billingCycle})`,
      },
    });

    return { order, invoice };
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        order: result.order,
        invoice: { ...result.invoice, amount: result.invoice.amount.toString() },
      },
    },
    { status: 201 }
  );
}
