import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Server, ShieldCheck, Activity } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard Admin" };

async function getStats() {
  const [totalUsers, totalClients] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
  ]);

  return { totalUsers, totalClients };
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tableau de bord
        </h2>
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
          description="Comptes clients actifs"
          color="blue"
        />
        <KpiCard
          title="Services actifs"
          value={0}
          icon={Server}
          description="Préparé pour la Phase 2"
          color="green"
        />
        <KpiCard
          title="Services suspendus"
          value={0}
          icon={ShieldCheck}
          description="Préparé pour la Phase 2"
          color="amber"
        />
        <KpiCard
          title="Revenus"
          value={"—"}
          icon={Activity}
          description="Disponible en Phase 6"
          color="purple"
        />
      </div>

      {/* Quick start info */}
      <Card>
        <CardHeader>
          <CardTitle>Phase 1 — Fondations & Authentification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>Authentification par email/mot de passe opérationnelle</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>2FA TOTP disponible (activable dans le profil)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>Protection des routes par rôle (ADMIN / CLIENT)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Phase 2 — Gestion clients & services (à venir)</span>
            </div>
          </div>
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
}

const colorMap = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function KpiCard({ title, value, icon: Icon, description, color }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {description}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
