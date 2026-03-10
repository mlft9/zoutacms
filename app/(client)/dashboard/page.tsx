import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Server, FileText, Settings, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Mon espace" };

const statusConfig = {
  ACTIVE:     { label: "Actif",      color: "bg-green-500",  icon: CheckCircle,   badge: "success" as const },
  PENDING:    { label: "En attente", color: "bg-yellow-500", icon: Clock,         badge: "warning" as const },
  SUSPENDED:  { label: "Suspendu",   color: "bg-orange-500", icon: AlertCircle,   badge: "warning" as const },
  TERMINATED: { label: "Résilié",    color: "bg-red-500",    icon: XCircle,       badge: "danger" as const },
};

export default async function ClientDashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const name = session?.user?.name ?? session?.user?.email;

  const services = userId
    ? await prisma.service.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  const activeCount = services.filter((s) => s.status === "ACTIVE").length;
  const pendingCount = services.filter((s) => s.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bonjour, {name} 👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Bienvenue sur votre espace ZoutaCMS
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Server className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{services.length}</p>
              <p className="text-sm text-gray-500">Services au total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
              <p className="text-sm text-gray-500">Services actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
              <p className="text-sm text-gray-500">En attente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent services */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Mes services récents</CardTitle>
          <Link href="/services">
            <Button variant="secondary" size="sm">Voir tout</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Server className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun service pour le moment</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {services.map((service) => {
                const cfg = statusConfig[service.status as keyof typeof statusConfig];
                const _Icon = cfg.icon;
                return (
                  <div key={service.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
                      <div>
                        <p className="font-medium text-sm">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cfg.badge}>{cfg.label}</Badge>
                      <Link href={`/services/${service.id}`}>
                        <Button variant="ghost" size="sm">Détails</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle>Mes factures</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Consultez l&apos;historique de vos factures.
            </p>
            <Link href="/invoices">
              <Button variant="secondary" size="sm">Voir les factures</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <CardTitle>Mon profil</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Gérez vos informations personnelles et la sécurité de votre compte.
            </p>
            <Link href="/profile">
              <Button variant="secondary" size="sm">Gérer mon profil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
