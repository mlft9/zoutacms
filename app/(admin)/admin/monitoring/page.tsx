"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Clock,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

interface LatestCheck {
  id: string;
  status: "UP" | "DOWN" | "DEGRADED";
  latency: number | null;
  checkedAt: string;
  error: string | null;
}

interface OpenAlert {
  id: string;
  type: string;
  message: string | null;
  createdAt: string;
}

interface ServiceRow {
  id: string;
  name: string;
  status: string;
  providerName: string | null;
  clientName: string;
  latestCheck: LatestCheck | null;
  openAlert: OpenAlert | null;
  uptime24h: number;
}

interface Summary {
  total: number;
  up: number;
  down: number;
  openIncidents: number;
}

interface AlertConfigData {
  panelEnabled: boolean;
  discordEnabled: boolean;
  discordWebhook: string | null;
}

function formatDuration(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function StatusBadge({ status }: { status: "UP" | "DOWN" | "DEGRADED" | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        Inconnu
      </span>
    );
  }
  const map = {
    UP: {
      label: "En ligne",
      dot: "bg-green-500",
      cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    DOWN: {
      label: "Hors ligne",
      dot: "bg-red-500",
      cls: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    DEGRADED: {
      label: "Dégradé",
      dot: "bg-orange-500",
      cls: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    },
  };
  const { label, dot, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${status === "UP" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

export default function MonitoringPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [_config, setConfig] = useState<AlertConfigData | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [discordEnabled, setDiscordEnabled] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitoring");
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setServices(json.data.services);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/admin/monitoring/config");
    const json = await res.json();
    if (json.success) {
      setConfig(json.data);
      setDiscordEnabled(json.data.discordEnabled);
      setDiscordWebhook(json.data.discordWebhook ?? "");
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchConfig();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData, fetchConfig]);

  const saveConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/admin/monitoring/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordEnabled,
          discordWebhook: discordWebhook || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
        toast.success("Configuration sauvegardée");
      } else {
        toast.error(json.error?.message ?? "Erreur");
      }
    } finally {
      setConfigLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monitoring</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Surveillance des services en temps réel
            {lastRefresh && (
              <span className="ml-2">· Mis à jour {formatDuration(lastRefresh.toISOString())}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Services surveillés</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.up}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">En ligne</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.down}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Hors ligne</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${summary.openIncidents > 0 ? "bg-orange-50 dark:bg-orange-900/30" : "bg-gray-50 dark:bg-gray-800"}`}>
                <AlertTriangle className={`h-5 w-5 ${summary.openIncidents > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.openIncidents}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Incidents ouverts</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table des services */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">État des services</h3>
        </div>
        {services.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucun service avec provider configuré.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uptime 24h</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Latence</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dernier check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {services.map((s) => (
                  <tr key={s.id} className={s.openAlert ? "bg-red-50/30 dark:bg-red-900/10" : ""}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                        {s.providerName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{s.providerName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.clientName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.latestCheck?.status ?? null} />
                    </td>
                    <td className="px-4 py-3">
                      {s.uptime24h < 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.uptime24h >= 99 ? "bg-green-500" : s.uptime24h >= 95 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${s.uptime24h}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {s.uptime24h}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.latestCheck?.latency != null ? (
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Wifi className="h-3 w-3" />
                          {s.latestCheck.latency}ms
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.latestCheck ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatDuration(s.latestCheck.checkedAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Jamais vérifié</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incidents ouverts */}
      {summary && summary.openIncidents > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-red-200 dark:border-red-900/50">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Incidents en cours
            </h3>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {services
              .filter((s) => s.openAlert !== null)
              .map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">{s.name}</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                      {s.openAlert?.message ?? "Service inaccessible"} · Client : {s.clientName}
                    </p>
                  </div>
                  <span className="text-xs text-red-500 dark:text-red-400 shrink-0 ml-4">
                    Depuis {formatDuration(s.openAlert!.createdAt)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Configuration Discord */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Configuration des alertes</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={discordEnabled}
              onChange={(e) => setDiscordEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Webhook Discord</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Envoyer des notifications dans un channel Discord
              </p>
            </div>
          </label>

          {discordEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                URL du webhook
              </label>
              <input
                type="url"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            onClick={saveConfig}
            disabled={configLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {configLoading ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Instructions cron */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Configuration du cron health-check
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Ajouter cette tâche cron sur votre serveur (toutes les 5 minutes) :
        </p>
        <code className="block bg-gray-900 dark:bg-black text-green-400 text-xs rounded-lg p-3 font-mono leading-relaxed">
          */5 * * * * curl -s -H &quot;Authorization: Bearer $CRON_SECRET&quot; {typeof window !== "undefined" ? window.location.origin : ""}/api/cron/health-check
        </code>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Définir la variable <code className="font-mono">CRON_SECRET</code> dans votre <code className="font-mono">.env</code>.
        </p>
      </div>
    </div>
  );
}
