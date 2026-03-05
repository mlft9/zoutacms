import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Server, ShieldCheck, Activity, Clock } from "lucide-react";
import {
  RegistrationsChart,
  ServicesByTypeChart,
  ServicesByStatusChart,
} from "@/components/admin/dashboard-charts";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard Admin" };

async function getStats() {
  const [
    totalClients,
    activeServices,
    suspendedServices,
    totalServices,
    recentClients,
    servicesByType,
    servicesByStatus,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.service.count({ where: { status: "ACTIVE" } }),
    prisma.service.count({ where: { status: "SUSPENDED" } }),
    prisma.service.count(),
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt")::text as date, COUNT(*)::bigint as count
      FROM "User"
      WHERE role = 'CLIENT'
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    prisma.service.groupBy({ by: ["type"], _count: { id: true } }),
    prisma.service.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.auditLog.findMany({
      where: { entity: { not: null } },
      select: {
        id: true,
        action: true,
        entity: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    totalClients,
    activeServices,
    suspendedServices,
    totalServices,
    recentClients: recentClients.map((r) => ({ date: r.date, count: Number(r.count) })),
    servicesByType: servicesByType.map((s) => ({ type: s.type, count: s._count.id })),
    servicesByStatus: servicesByStatus.map((s) => ({ status: s.status, count: s._count.id })),
    recentActivity,
  };
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    CLIENT_CREATED: "Client créé",
    CLIENT_UPDATED: "Client modifié",
    CLIENT_DELETED: "Client supprimé",
    CLIENT_SUSPENDED: "Client suspendu",
    CLIENT_ACTIVATED: "Client activé",
    SERVICE_CREATED: "Service créé",
    SERVICE_UPDATED: "Service modifié",
    SERVICE_DELETED: "Service supprimé",
  };
  return labels[action] ?? action;
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Bienvenue, {session?.user?.name ?? session?.user?.email}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Clients"
          value={stats.totalClients}
          icon={Users}
          description="Comptes clients"
          color="blue"
          href="/admin/clients"
        />
        <KpiCard
          title="Services actifs"
          value={stats.activeServices}
          icon={Server}
          description={`sur ${stats.totalServices} au total`}
          color="green"
          href="/admin/services"
        />
        <KpiCard
          title="Services suspendus"
          value={stats.suspendedServices}
          icon={ShieldCheck}
          description="Nécessitent une attention"
          color="amber"
          href="/admin/services?status=SUSPENDED"
        />
        <KpiCard
          title="Revenus"
          value="—"
          icon={Activity}
          description="Disponible en Phase 6"
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Inscriptions (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <RegistrationsChart data={stats.recentClients} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Services par type</CardTitle>
          </CardHeader>
          <CardContent>
            <ServicesByTypeChart data={stats.servicesByType} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Services par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ServicesByStatusChart data={stats.servicesByStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Activité récente</CardTitle>
            <Link
              href="/admin/logs"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Voir tout
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune activité pour le moment</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.recentActivity.map((log) => {
                const adminName =
                  log.user?.firstName && log.user?.lastName
                    ? `${log.user.firstName} ${log.user.lastName}`
                    : (log.user?.email ?? "Système");
                return (
                  <li key={log.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {actionLabel(log.action)}
                      </span>
                      <span className="text-gray-500"> par {adminName}</span>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {timeAgo(log.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description: string;
  color: "blue" | "green" | "amber" | "purple";
  href?: string;
}

const colorMap = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function KpiCard({ title, value, icon: Icon, description, color, href }: KpiCardProps) {
  const content = (
    <Card className={href ? "transition-shadow hover:shadow-md" : undefined}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
