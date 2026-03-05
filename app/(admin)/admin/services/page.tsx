"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Server, Plus, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

type ServiceStatus = "ACTIVE" | "SUSPENDED" | "PENDING" | "TERMINATED";
type ServiceType = "VPS" | "MINECRAFT";

interface Service {
  id: string;
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  createdAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
}

interface Pagination {
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const STATUS_LABEL: Record<ServiceStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  PENDING: "En attente",
  TERMINATED: "Résilié",
};
const STATUS_VARIANT: Record<ServiceStatus, "success" | "warning" | "info" | "danger"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  PENDING: "info",
  TERMINATED: "danger",
};

export default function ServicesPage() {
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/services?${params}`);
      const json = await res.json();
      if (json.success) {
        setServices(json.data.services);
        setPagination(json.data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, type, status]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Service supprimé");
        setDeleteTarget(null);
        fetchServices();
      } else {
        toast.error(json.error?.message ?? "Erreur");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const userName = (u: Service["user"]) =>
    u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination ? `${pagination.total} service${pagination.total > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Link href="/admin/services/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nouveau service
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="w-40"
        >
          <option value="">Tous les types</option>
          <option value="VPS">VPS</option>
          <option value="MINECRAFT">Minecraft</option>
        </Select>
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-44"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="SUSPENDED">Suspendu</option>
          <option value="PENDING">En attente</option>
          <option value="TERMINATED">Résilié</option>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} cols={5} />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Server className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Aucun service trouvé</p>
            <Link href="/admin/services/new">
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4" />
                Créer un service
              </Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Service</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Créé le</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <Link
                      href={`/admin/services/${service.id}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {service.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral">{service.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[service.status]}>
                      {STATUS_LABEL[service.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    <Link
                      href={`/admin/clients/${service.user.id}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {userName(service.user)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(service.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/services/${service.id}`}>
                        <button
                          title="Modifier"
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(service)}
                        title="Supprimer"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
              <Button size="sm" variant="outline" disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <Button size="sm" variant="outline" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le service ?"
        description={`Le service "${deleteTarget?.name}" sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
