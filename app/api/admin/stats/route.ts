import { requireAdmin } from "@/lib/admin-guard";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  try {
    const [
      totalClients,
      activeServices,
      suspendedServices,
      totalServices,
      recentClients,
      servicesByType,
      servicesByStatus,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.service.count({ where: { status: "ACTIVE" } }),
      prisma.service.count({ where: { status: "SUSPENDED" } }),
      prisma.service.count(),
      // Inscriptions des 30 derniers jours (par jour)
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt")::text as date, COUNT(*)::bigint as count
        FROM "User"
        WHERE role = 'CLIENT'
          AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Répartition par type
      prisma.service.groupBy({
        by: ["type"],
        _count: { id: true },
      }),
      // Répartition par statut
      prisma.service.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    return apiSuccess({
      totalClients,
      activeServices,
      suspendedServices,
      totalServices,
      recentClients: recentClients.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      servicesByType: servicesByType.map((s) => ({
        type: s.type,
        count: s._count.id,
      })),
      servicesByStatus: servicesByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    });
  } catch {
    return apiError(ErrorCodes.INTERNAL_ERROR, "Erreur lors de la récupération des statistiques", 500);
  }
}
