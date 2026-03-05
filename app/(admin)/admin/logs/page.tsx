"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { FileText, Search } from "lucide-react";

interface LogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
}

interface Pagination {
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  CLIENT_CREATED: "Client créé",
  CLIENT_UPDATED: "Client modifié",
  CLIENT_DELETED: "Client supprimé",
  CLIENT_SUSPENDED: "Client suspendu",
  CLIENT_ACTIVATED: "Client activé",
  SERVICE_CREATED: "Service créé",
  SERVICE_UPDATED: "Service modifié",
  SERVICE_DELETED: "Service supprimé",
};

const ENTITY_OPTIONS = [
  { value: "", label: "Toutes les entités" },
  { value: "User", label: "Client" },
  { value: "Service", label: "Service" },
];

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (action) params.set("action", action);
      if (entity) params.set("entity", entity);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setPagination(json.data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [page, action, entity, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const adminName = (log: LogEntry) => {
    if (!log.user) return "Système";
    const u = log.user;
    return u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Journal des actions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {pagination ? `${pagination.total} entrée${pagination.total > 1 ? "s" : ""}` : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Filtrer par action..."
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          className="w-44"
        >
          {ENTITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="w-40"
          title="Du"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="w-40"
          title="Au"
        />
        {(action || entity || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAction(""); setEntity(""); setFrom(""); setTo(""); setPage(1); }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={8} cols={4} />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Aucune entrée dans le journal</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Entité</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Admin</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Détails</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {log.entity ? (
                      <span>
                        {log.entity === "User" ? "Client" : log.entity}
                        {log.entityId && (
                          <span className="ml-1 font-mono text-xs text-gray-400">
                            #{log.entityId.slice(0, 8)}
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {adminName(log)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                    {log.meta && Object.keys(log.meta).length > 0
                      ? Object.entries(log.meta)
                          .filter(([, v]) => v !== null && v !== undefined && v !== "")
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <span className="text-xs text-gray-500">
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
