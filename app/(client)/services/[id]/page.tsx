import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Square,
  Play,
  Terminal,
  ArrowLeft,
  Server,
  Cpu,
  HardDrive,
  Network,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Détails du service" };

const statusConfig = {
  ACTIVE:     { label: "Actif",      variant: "success" as const,   dot: "bg-green-500" },
  PENDING:    { label: "En attente", variant: "warning" as const,   dot: "bg-yellow-500" },
  SUSPENDED:  { label: "Suspendu",   variant: "warning" as const,   dot: "bg-orange-500" },
  TERMINATED: { label: "Résilié",    variant: "danger" as const,    dot: "bg-red-500" },
};

export default async function ServiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const service = await prisma.service.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!service) notFound();

  const cfg = statusConfig[service.status as keyof typeof statusConfig];
  const config = service.config as Record<string, string | number>;

  const techFields: { label: string; key: string; icon: React.ElementType }[] = [
    { label: "Adresse IP",   key: "ip",      icon: Network },
    { label: "Port",         key: "port",    icon: Network },
    { label: "RAM",          key: "ram",     icon: HardDrive },
    { label: "CPU",          key: "cpu",     icon: Cpu },
    { label: "Stockage",     key: "storage", icon: HardDrive },
    { label: "Slots",        key: "slots",   icon: Server },
    { label: "OS",           key: "os",      icon: Server },
    { label: "Version",      key: "version", icon: Server },
  ];

  const presentFields = techFields.filter((f) => config[f.key] !== undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/services">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {service.name}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {service.type} &mdash; créé le{" "}
            {new Date(service.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Actions — désactivées en Phase 3 */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled title="Disponible en Phase 4">
            <Play className="h-4 w-4 mr-1" />
            Démarrer
          </Button>
          <Button variant="secondary" size="sm" disabled title="Disponible en Phase 4">
            <Square className="h-4 w-4 mr-1" />
            Arrêter
          </Button>
          <Button variant="secondary" size="sm" disabled title="Disponible en Phase 4">
            <RefreshCw className="h-4 w-4 mr-1" />
            Redémarrer
          </Button>
          <Button variant="secondary" size="sm" disabled title="Disponible en Phase 4">
            <Terminal className="h-4 w-4 mr-1" />
            Console
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Technical details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations techniques</CardTitle>
          </CardHeader>
          <CardContent>
            {presentFields.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune information technique disponible.</p>
            ) : (
              <dl className="divide-y dark:divide-gray-800">
                {presentFields.map(({ label, key, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-2.5 text-sm">
                    <dt className="flex items-center gap-2 text-gray-500">
                      <Icon className="h-4 w-4" />
                      {label}
                    </dt>
                    <dd className="font-mono font-medium">{String(config[key])}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Status + metrics placeholder */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statut en temps réel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border dark:border-gray-800 p-4">
                <span className={`h-3 w-3 rounded-full ${cfg.dot} animate-pulse`} />
                <div>
                  <p className="font-medium">{cfg.label}</p>
                  <p className="text-xs text-gray-500">
                    Provisionnement automatique disponible en Phase 4
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métriques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="grid grid-cols-3 gap-3 w-full">
                  {["CPU", "RAM", "Réseau"].map((m) => (
                    <div
                      key={m}
                      className="rounded-lg border dark:border-gray-800 p-3 text-center"
                    >
                      <div className="h-8 w-full rounded bg-gray-100 dark:bg-gray-800 mb-2" />
                      <p className="text-xs text-gray-500">{m}</p>
                      <p className="text-xs font-medium text-gray-400">Phase 5</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dates */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Créé le :</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(service.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Prochain renouvellement :</span>
              <span className="font-medium text-gray-400 italic">Disponible en Phase 6</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
