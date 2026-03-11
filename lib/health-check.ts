import { prisma } from "@/lib/prisma";
import { createProvider } from "@/lib/providers/registry";
import type { Prisma } from "@prisma/client";

/**
 * Runs a single health check for a service and persists the result.
 * Safe to call fire-and-forget (errors are caught internally).
 */
export async function runHealthCheck(serviceId: string): Promise<void> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      provider: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      alerts: { where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!service?.provider || !service.externalId) return;
  if (!["ACTIVE", "SUSPENDED"].includes(service.status)) return;

  const alertConfig = await prisma.alertConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const start = Date.now();
  let healthStatus: "UP" | "DOWN" | "DEGRADED" = "DOWN";
  let metricsData: Record<string, unknown> | null = null;
  let errorMsg: string | undefined;

  try {
    const plugin = createProvider(
      service.provider.provider,
      service.provider.config as Record<string, unknown>
    );

    const [vmStatus, vmMetrics] = await Promise.all([
      plugin.getStatus(service.externalId),
      plugin.getMetrics
        ? plugin.getMetrics(service.externalId).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (vmStatus === "running") healthStatus = "UP";
    else if (vmStatus === "suspended") healthStatus = "DEGRADED";
    else healthStatus = "DOWN";

    if (vmMetrics) {
      metricsData = {
        cpu: vmMetrics.cpu,
        ram: vmMetrics.ram,
        ramUsed: vmMetrics.ramUsed,
        ramTotal: vmMetrics.ramTotal,
        diskTotal: vmMetrics.diskTotal,
        netIn: vmMetrics.network?.in,
        netOut: vmMetrics.network?.out,
      };
    }
  } catch (err) {
    healthStatus = "DOWN";
    errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
  }

  const latency = Date.now() - start;

  await prisma.healthCheck.create({
    data: {
      serviceId: service.id,
      status: healthStatus,
      latency,
      metrics: metricsData ? (metricsData as Prisma.InputJsonValue) : undefined,
      error: errorMsg,
    },
  });

  // Alert management
  const openAlert = service.alerts[0];
  const clientName = service.user.firstName
    ? `${service.user.firstName} ${service.user.lastName ?? ""}`.trim()
    : service.user.email;

  if (healthStatus === "DOWN" && !openAlert) {
    await prisma.alert.create({
      data: { serviceId: service.id, type: "down", message: errorMsg ?? "Service inaccessible" },
    });
    if (alertConfig.discordEnabled && alertConfig.discordWebhook) {
      fetch(alertConfig.discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "ZoutaCMS",
          embeds: [{
            title: `🔴 Service hors ligne : ${service.name}`,
            description: `Le service **${service.name}** (client : ${clientName}) est inaccessible.${errorMsg ? `\nErreur : ${errorMsg}` : ""}`,
            color: 0xe74c3c,
            timestamp: new Date().toISOString(),
            footer: { text: "ZoutaCMS Monitoring" },
          }],
        }),
      }).catch(() => {});
    }
  } else if (healthStatus === "UP" && openAlert) {
    await prisma.alert.update({
      where: { id: openAlert.id },
      data: { resolvedAt: new Date(), type: "up" },
    });
    if (alertConfig.discordEnabled && alertConfig.discordWebhook) {
      fetch(alertConfig.discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "ZoutaCMS",
          embeds: [{
            title: `🟢 Service rétabli : ${service.name}`,
            description: `Le service **${service.name}** (client : ${clientName}) est de nouveau en ligne.`,
            color: 0x2ecc71,
            timestamp: new Date().toISOString(),
            footer: { text: "ZoutaCMS Monitoring" },
          }],
        }),
      }).catch(() => {});
    }
  }
}
