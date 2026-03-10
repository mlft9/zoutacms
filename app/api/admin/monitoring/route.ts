import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const services = await prisma.service.findMany({
    where: { providerId: { not: null }, externalId: { not: null } },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      provider: { select: { name: true } },
      healthChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
      alerts: { where: { resolvedAt: null }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  // Uptime 24h par service
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const serviceIds = services.map((s) => s.id);

  const recentChecks = serviceIds.length
    ? await prisma.healthCheck.findMany({
        where: { serviceId: { in: serviceIds }, checkedAt: { gte: since24h } },
        select: { serviceId: true, status: true },
      })
    : [];

  const uptimeMap = new Map<string, number>();
  for (const id of serviceIds) {
    const checks = recentChecks.filter((c) => c.serviceId === id);
    if (checks.length === 0) {
      uptimeMap.set(id, -1);
    } else {
      const up = checks.filter((c) => c.status === "UP").length;
      uptimeMap.set(id, Math.round((up / checks.length) * 1000) / 10);
    }
  }

  const formattedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    providerName: s.provider?.name ?? null,
    clientName: s.user.firstName
      ? `${s.user.firstName} ${s.user.lastName ?? ""}`.trim()
      : s.user.email,
    latestCheck: s.healthChecks[0] ?? null,
    openAlert: s.alerts[0] ?? null,
    uptime24h: uptimeMap.get(s.id) ?? -1,
  }));

  const total = formattedServices.length;
  const up = formattedServices.filter((s) => s.latestCheck?.status === "UP").length;
  const down = formattedServices.filter((s) => s.latestCheck?.status === "DOWN").length;
  const openIncidents = formattedServices.filter((s) => s.openAlert !== null).length;

  return NextResponse.json({
    success: true,
    data: {
      summary: { total, up, down, openIncidents },
      services: formattedServices,
    },
  });
}
