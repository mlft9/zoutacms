import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Non authentifié" } },
      { status: 401 }
    );
  }

  const service = await prisma.service.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      healthChecks: {
        orderBy: { checkedAt: "desc" },
        take: 48,
        select: {
          checkedAt: true,
          status: true,
          latency: true,
          metrics: true,
        },
      },
    },
  });

  if (!service) {
    return NextResponse.json(
      { success: false, error: { message: "Service introuvable" } },
      { status: 404 }
    );
  }

  const history = [...service.healthChecks].reverse();

  return NextResponse.json({
    success: true,
    data: {
      latest: service.healthChecks[0] ?? null,
      history,
    },
  });
}
