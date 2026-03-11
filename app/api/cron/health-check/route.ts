import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runHealthCheck } from "@/lib/health-check";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: {
      providerId: { not: null },
      externalId: { not: null },
      status: { in: ["ACTIVE", "SUSPENDED"] },
    },
    select: { id: true },
  });

  let checked = 0;
  let errors = 0;

  for (const service of services) {
    try {
      await runHealthCheck(service.id);
      checked++;
    } catch {
      errors++;
    }
  }

  // Purge checks older than 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { count: purged } = await prisma.healthCheck.deleteMany({
    where: { checkedAt: { lt: cutoff } },
  });

  return NextResponse.json({ success: true, checked, errors, purged });
}
