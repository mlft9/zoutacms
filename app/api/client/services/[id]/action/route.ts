import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { performServiceAction } from "@/lib/provisioning";

const schema = z.object({
  action: z.enum(["start", "stop", "restart"]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Verify ownership
  const service = await prisma.service.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!service) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }
  if (service.status !== "ACTIVE" && service.status !== "SUSPENDED") {
    return NextResponse.json({ error: "Action non disponible dans cet état" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await performServiceAction(params.id, parsed.data.action);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lors de l'action" },
      { status: 500 }
    );
  }
}
