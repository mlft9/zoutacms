import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  userId: z.string().min(1),
  serviceId: z.string().optional().nullable(),
  description: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
});

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const userId = searchParams.get("userId");

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status ? { status: status as "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "EXPIRED" } : {}),
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
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

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: "Données invalides", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: "Utilisateur introuvable" } },
      { status: 404 }
    );
  }

  const year = new Date().getFullYear();
  const invoiceCount = await prisma.invoice.count();
  const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(4, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      userId: parsed.data.userId,
      serviceId: parsed.data.serviceId ?? null,
      description: parsed.data.description,
      amount: parsed.data.amount,
      dueDate: new Date(parsed.data.dueDate),
      status: "PENDING",
    },
  });

  return NextResponse.json(
    { success: true, data: { ...invoice, amount: invoice.amount.toString() } },
    { status: 201 }
  );
}
