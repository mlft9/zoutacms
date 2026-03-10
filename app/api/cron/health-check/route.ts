import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProvider } from "@/lib/providers/registry";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Upsert AlertConfig singleton
  const alertConfig = await prisma.alertConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // Services avec provider + externalId + statut monitored
  const services = await prisma.service.findMany({
    where: {
      providerId: { not: null },
      externalId: { not: null },
      status: { in: ["ACTIVE", "SUSPENDED"] },
    },
    include: {
      provider: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      alerts: {
        where: { resolvedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let checked = 0;
  let errors = 0;
  let newAlerts = 0;

  for (const service of services) {
    if (!service.provider || !service.externalId) continue;

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
      checked++;
    } catch (err) {
      healthStatus = "DOWN";
      errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
      errors++;
    }

    const latency = Date.now() - start;

    await prisma.healthCheck.create({
      data: {
        serviceId: service.id,
        status: healthStatus,
        latency,
        metrics: metricsData ? (metricsData as import("@prisma/client").Prisma.InputJsonValue) : undefined,
        error: errorMsg,
      },
    });

    // Gestion des alertes
    const openAlert = service.alerts[0];
    const clientName = service.user.firstName
      ? `${service.user.firstName} ${service.user.lastName ?? ""}`.trim()
      : service.user.email;

    if (healthStatus === "DOWN" && !openAlert) {
      await prisma.alert.create({
        data: {
          serviceId: service.id,
          type: "down",
          message: errorMsg ?? "Service inaccessible",
        },
      });
      newAlerts++;

      if (alertConfig.discordEnabled && alertConfig.discordWebhook) {
        await sendDiscordEmbed(alertConfig.discordWebhook, {
          title: `🔴 Service hors ligne : ${service.name}`,
          description: `Le service **${service.name}** (client : ${clientName}) est inaccessible.${errorMsg ? `\nErreur : ${errorMsg}` : ""}`,
          color: 0xe74c3c,
        }).catch(() => {});
      }
    } else if (healthStatus === "UP" && openAlert) {
      await prisma.alert.update({
        where: { id: openAlert.id },
        data: { resolvedAt: new Date(), type: "up" },
      });

      if (alertConfig.discordEnabled && alertConfig.discordWebhook) {
        await sendDiscordEmbed(alertConfig.discordWebhook, {
          title: `🟢 Service rétabli : ${service.name}`,
          description: `Le service **${service.name}** (client : ${clientName}) est de nouveau en ligne.`,
          color: 0x2ecc71,
        }).catch(() => {});
      }
    }
  }

  // Purge des checks de plus de 30 jours
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { count: purged } = await prisma.healthCheck.deleteMany({
    where: { checkedAt: { lt: cutoff } },
  });

  return NextResponse.json({
    success: true,
    checked,
    errors,
    newAlerts,
    purged,
  });
}

async function sendDiscordEmbed(
  webhookUrl: string,
  embed: { title: string; description: string; color: number }
) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "ZoutaCMS",
      embeds: [
        {
          ...embed,
          timestamp: new Date().toISOString(),
          footer: { text: "ZoutaCMS Monitoring" },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Discord webhook: ${res.status}`);
}
