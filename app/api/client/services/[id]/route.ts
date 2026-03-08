import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const service = await prisma.service.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!service) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }

  return NextResponse.json(service);
}
