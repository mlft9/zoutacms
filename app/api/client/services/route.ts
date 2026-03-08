import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const services = await prisma.service.findMany({
    where: {
      userId: session.user.id,
      ...(type ? { type: type as "VPS" | "MINECRAFT" } : {}),
      ...(status ? { status: status as "ACTIVE" | "SUSPENDED" | "PENDING" | "TERMINATED" } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(services);
}
