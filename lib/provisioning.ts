import { prisma } from "@/lib/prisma";
import { createProvider } from "@/lib/providers/registry";
import type { ProviderSlug } from "@/lib/providers/registry";
import type { ProviderConfigData, ProvisionConfig } from "@/lib/providers/types";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]; // 1min, 5min, 15min

export async function provisionService(serviceId: string): Promise<void> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { provider: true },
  });

  if (!service || !service.provider) {
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: "PROVISIONING_FAILED",
        provisionError: "Provider introuvable ou non configuré",
      },
    });
    return;
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: { status: "PROVISIONING", provisionError: null },
  });

  try {
    const plugin = createProvider(
      service.provider.provider as ProviderSlug,
      service.provider.config as ProviderConfigData
    );

    const config = service.config as Record<string, unknown>;
    const provisionConfig: ProvisionConfig = {
      name: service.name,
      type: service.type as "VPS" | "MINECRAFT",
      ram: config.ram as number | undefined,
      cpu: config.cpu as number | undefined,
      storage: config.storage as number | undefined,
      templateVmid: config.templateVmid as number | undefined,
      vmid: config.vmid as number | undefined,
      storagePool: config.storagePool as string | undefined,
      bridge: config.bridge as string | undefined,
      ipConfig: config.ipConfig as string | undefined,
      ciuser: config.ciuser as string | undefined,
      cipassword: config.cipassword as string | undefined,
      sshkeys: config.sshkeys as string | undefined,
    };

    const result = await plugin.create(provisionConfig);

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: "ACTIVE",
        externalId: result.externalId,
        provisionError: null,
        provisionAttempts: { increment: 1 },
        config: {
          ...(service.config as object),
          ...(result.additionalConfig ?? {}),
          ...(result.ip ? { ip: result.ip } : {}),
          ...(result.port ? { port: result.port } : {}),
        },
      },
    });
  } catch (err) {
    const attempts = service.provisionAttempts + 1;
    const delayMs = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
    const nextRetry = attempts < MAX_ATTEMPTS ? new Date(Date.now() + delayMs) : null;

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: attempts >= MAX_ATTEMPTS ? "PROVISIONING_FAILED" : "PROVISIONING_FAILED",
        provisionError: err instanceof Error ? err.message : "Erreur inconnue",
        provisionAttempts: attempts,
        nextRetryAt: nextRetry,
      },
    });
  }
}

export async function performServiceAction(
  serviceId: string,
  action: "start" | "stop" | "restart" | "suspend" | "unsuspend" | "terminate"
): Promise<void> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { provider: true },
  });

  if (!service?.externalId || !service.provider) {
    throw new Error("Service non provisionné ou provider manquant");
  }

  const plugin = createProvider(
    service.provider.provider as ProviderSlug,
    service.provider.config as ProviderConfigData
  );

  await plugin[action](service.externalId);

  // Update status in DB
  const statusMap: Record<string, string> = {
    start: "ACTIVE",
    stop: "SUSPENDED",
    restart: "ACTIVE",
    suspend: "SUSPENDED",
    unsuspend: "ACTIVE",
    terminate: "TERMINATING",
  };

  await prisma.service.update({
    where: { id: serviceId },
    data: { status: statusMap[action] as never },
  });

  if (action === "terminate") {
    await prisma.service.update({
      where: { id: serviceId },
      data: { status: "TERMINATED" },
    });
  }
}
