"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Square,
  Play,
  ArrowLeft,
  Server,
  Cpu,
  HardDrive,
  Network,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  type: "VPS" | "MINECRAFT";
  status: string;
  config: Record<string, string | number>;
  externalId: string | null;
  providerId: string | null;
  provisionError: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" | "info"; dot: string }> = {
  ACTIVE:                 { label: "Actif",            variant: "success",  dot: "bg-green-500" },
  PENDING:                { label: "En attente",       variant: "neutral",  dot: "bg-gray-400" },
  PROVISIONING:           { label: "Provisionnement",  variant: "info",     dot: "bg-blue-500 animate-pulse" },
  PROVISIONING_FAILED:    { label: "Échec provision",  variant: "danger",   dot: "bg-red-500" },
  PROVISIONING_TIMEOUT:   { label: "Timeout",          variant: "danger",   dot: "bg-red-500" },
  REQUIRES_MANUAL_CHECK:  { label: "Vérification req.", variant: "warning", dot: "bg-orange-500" },
  SUSPENDED:              { label: "Arrêtée",          variant: "neutral",  dot: "bg-gray-400" },
  TERMINATING:            { label: "Résiliation...",   variant: "neutral",  dot: "bg-gray-400 animate-pulse" },
  TERMINATED:             { label: "Résilié",          variant: "danger",   dot: "bg-red-500" },
};

const techFields = [
  { label: "Adresse IP", key: "ip",      icon: Network },
  { label: "Port",       key: "port",    icon: Network },
  { label: "RAM",        key: "ram",     icon: HardDrive },
  { label: "CPU",        key: "cpu",     icon: Cpu },
  { label: "Stockage",   key: "storage", icon: HardDrive },
  { label: "Slots",      key: "slots",   icon: Server },
  { label: "OS",         key: "os",      icon: Server },
  { label: "Version",    key: "version", icon: Server },
  { label: "VM ID",      key: "vmid",    icon: Server },
  { label: "Nœud",       key: "node",    icon: Server },
];

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchService = useCallback(async () => {
    const res = await fetch(`/api/client/services/${id}`);
    if (res.status === 404) { router.push("/services"); return; }
    const data = await res.json();
    setService(data);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchService();
    // Poll every 5s while provisioning
    const interval = setInterval(() => {
      if (service?.status === "PROVISIONING") fetchService();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchService, service?.status]);

  async function handleAction(action: "start" | "stop" | "restart") {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/client/services/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(`Action "${action}" effectuée`);
      await fetchService();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

if (loading) return <div className="py-12 text-center text-sm text-gray-500">Chargement...</div>;
  if (!service) return null;

  const cfg = statusConfig[service.status] ?? { label: service.status, variant: "neutral" as const, dot: "bg-gray-400" };
  const presentFields = techFields.filter((f) => service.config[f.key] !== undefined);
  const isProvisioned = !!service.externalId;
  const isActive = service.status === "ACTIVE";
  const canAct = isProvisioned && (service.status === "ACTIVE" || service.status === "SUSPENDED");

  return (
    <div className="flex flex-col gap-6">
      <div>
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{service.name}</h2>
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {service.type} — créé le{" "}
            {new Date(service.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary" size="sm"
            disabled={!canAct || service.status !== "SUSPENDED"}
            loading={actionLoading === "start"}
            onClick={() => handleAction("start")}
            title={!canAct ? "Service non provisionné" : undefined}
          >
            <Play className="h-4 w-4 mr-1" />
            Démarrer
          </Button>
          <Button
            variant="secondary" size="sm"
            disabled={!canAct || !isActive}
            loading={actionLoading === "stop"}
            onClick={() => handleAction("stop")}
            title={!canAct ? "Service non provisionné" : undefined}
          >
            <Square className="h-4 w-4 mr-1" />
            Arrêter
          </Button>
          <Button
            variant="secondary" size="sm"
            disabled={!canAct || !isActive}
            loading={actionLoading === "restart"}
            onClick={() => handleAction("restart")}
            title={!canAct ? "Service non provisionné" : undefined}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Redémarrer
          </Button>
        </div>
      </div>

      {/* Provision error banner */}
      {service.provisionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Erreur de provisionnement
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{service.provisionError}</p>
        </div>
      )}

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
                    <dd className="font-mono font-medium text-gray-900 dark:text-white">
                      {String(service.config[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Status card */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border dark:border-gray-800 p-4">
                <span className={`h-3 w-3 rounded-full ${cfg.dot}`} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{cfg.label}</p>
                  {!isProvisioned && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {service.status === "PROVISIONING"
                        ? "Provisionnement en cours..."
                        : "En attente de provisionnement"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métriques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {["CPU", "RAM", "Réseau"].map((m) => (
                  <div key={m} className="rounded-lg border dark:border-gray-800 p-3 text-center">
                    <div className="h-8 w-full rounded bg-gray-100 dark:bg-gray-800 mb-2" />
                    <p className="text-xs text-gray-500">{m}</p>
                    <p className="text-xs font-medium text-gray-400">Phase 5</p>
                  </div>
                ))}
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
