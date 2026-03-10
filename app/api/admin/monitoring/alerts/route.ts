import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const openOnly = new URL(req.url).searchParams.get("open") === "true";

  const alerts = await prisma.alert.findMany({
    where: openOnly ? { resolvedAt: null } : {},
    include: {
      service: {
        select: {
          name: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ success: true, data: alerts });
}
