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
  Activity,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface HealthMetrics {
  cpu?: number;
  ram?: number;
  ramUsed?: number;
  ramTotal?: number;
  diskTotal?: number;
  netIn?: number;
  netOut?: number;
}
interface HistoryPoint {
  checkedAt: string;
  status: "UP" | "DOWN" | "DEGRADED";
  latency: number | null;
  metrics: HealthMetrics | null;
}
interface MetricsData {
  latest: { status: "UP" | "DOWN" | "DEGRADED"; latency: number | null; metrics: HealthMetrics | null; checkedAt: string } | null;
  history: HistoryPoint[];
}

function formatBytes(bytes?: number): string {
  if (bytes == null) return "—";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} Go`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} Mo`;
  return `${(bytes / 1024).toFixed(0)} Ko`;
}

function MetricBar({ value, label, sublabel }: { value?: number; label: string; sublabel?: string }) {
  const pct = value ?? 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-blue-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {value != null ? `${value}%` : "—"}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
    </div>
  );
}

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
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  const fetchService = useCallback(async () => {
    const res = await fetch(`/api/client/services/${id}`);
    if (res.status === 404) { router.push("/services"); return; }
    const data = await res.json();
    setService(data);
    setLoading(false);
  }, [id, router]);

  const fetchMetrics = useCallback(async () => {
    const res = await fetch(`/api/client/services/${id}/metrics`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.success) setMetrics(json.data);
  }, [id]);

  useEffect(() => {
    fetchService();
    fetchMetrics();
    const interval = setInterval(() => {
      if (service?.status === "PROVISIONING") fetchService();
    }, 5000);
    const metricsInterval = setInterval(fetchMetrics, 30_000);
    return () => { clearInterval(interval); clearInterval(metricsInterval); };
  }, [fetchService, fetchMetrics, service?.status]);

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
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Métriques</CardTitle>
                {metrics?.latest && (
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {metrics.latest.latency != null ? `${metrics.latest.latency}ms` : ""}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!metrics?.latest ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {service.externalId
                    ? "Aucune donnée de monitoring. Le premier check est en attente."
                    : "Disponible après le provisionnement."}
                </p>
              ) : (
                <div className="space-y-4">
                  <MetricBar
                    value={metrics.latest.metrics?.cpu}
                    label="CPU"
                  />
                  <MetricBar
                    value={metrics.latest.metrics?.ram}
                    label="RAM"
                    sublabel={
                      metrics.latest.metrics?.ramUsed != null && metrics.latest.metrics?.ramTotal != null
                        ? `${formatBytes(metrics.latest.metrics.ramUsed)} / ${formatBytes(metrics.latest.metrics.ramTotal)}`
                        : undefined
                    }
                  />
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-lg border dark:border-gray-800 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Réseau entrant</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatBytes(metrics.latest.metrics?.netIn)}
                      </p>
                    </div>
                    <div className="rounded-lg border dark:border-gray-800 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Réseau sortant</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatBytes(metrics.latest.metrics?.netOut)}
                      </p>
                    </div>
                  </div>
                  {/* Mini uptime sparkline */}
                  {metrics.history.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Uptime — {metrics.history.length} derniers checks
                      </p>
                      <div className="flex gap-0.5 h-6">
                        {metrics.history.map((h, i) => (
                          <div
                            key={i}
                            title={`${h.status} — ${new Date(h.checkedAt).toLocaleTimeString("fr-FR")}`}
                            className={`flex-1 rounded-sm ${
                              h.status === "UP" ? "bg-green-500" :
                              h.status === "DEGRADED" ? "bg-orange-400" : "bg-red-500"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{metrics.history[0] ? new Date(metrics.history[0].checkedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        <span>Maintenant</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
