"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Users, Plus, Search } from "lucide-react";

interface Client {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isSuspended: boolean;
  createdAt: string;
  _count: { services: number };
}

interface Pagination {
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ClientsPage() {
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1"));

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/clients?${params}`);
      const json = await res.json();
      if (json.success) {
        setClients(json.data.clients);
        setPagination(json.data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClients();
  };

  const clientName = (c: Client) =>
    c.firstName || c.lastName ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : c.email;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination ? `${pagination.total} client${pagination.total > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Link href="/admin/clients/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nouveau client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Rechercher
        </Button>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} cols={4} />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Aucun client trouvé</p>
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Effacer la recherche
              </button>
            )}
            <Link href="/admin/clients/new">
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4" />
                Créer un client
              </Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Services</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Inscrit le</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {clientName(client)}
                      </span>
                      <Badge variant={client.isSuspended ? "warning" : "success"}>
                        {client.isSuspended ? "Suspendu" : "Actif"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{client.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral">
                      {client._count.services} service{client._count.services > 1 ? "s" : ""}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(client.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/clients/${client.id}`}>
                      <Button size="sm" variant="ghost" className="h-8 px-3 text-xs">
                        Voir les détails
                      </Button>
                    </Link>
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
