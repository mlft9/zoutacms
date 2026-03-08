"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Server, Search } from "lucide-react";
import Link from "next/link";

interface Service {
  id: string;
  name: string;
  type: "VPS" | "MINECRAFT";
  status: "ACTIVE" | "SUSPENDED" | "PENDING" | "TERMINATED";
  config: Record<string, unknown>;
  createdAt: string;
}

const statusConfig = {
  ACTIVE:     { label: "Actif",      variant: "success" as const,   dot: "bg-green-500" },
  PENDING:    { label: "En attente", variant: "warning" as const,   dot: "bg-yellow-500" },
  SUSPENDED:  { label: "Suspendu",   variant: "warning" as const,   dot: "bg-orange-500" },
  TERMINATED: { label: "Résilié",    variant: "danger" as const,    dot: "bg-red-500" },
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);

    setLoading(true);
    fetch(`/api/client/services?${params}`)
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [typeFilter, statusFilter]);

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mes services</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Liste de tous vos services hébergés
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-[160px]"
        >
          <option value="all">Tous les types</option>
          <option value="VPS">VPS</option>
          <option value="MINECRAFT">Minecraft</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-[160px]"
        >
          <option value="all">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="PENDING">En attente</option>
          <option value="SUSPENDED">Suspendu</option>
          <option value="TERMINATED">Résilié</option>
        </Select>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} service{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Server className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500">Aucun service trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-800 text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Nom</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Statut</th>
                    <th className="pb-3 pr-4 font-medium">IP / Port</th>
                    <th className="pb-3 font-medium">Créé le</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {filtered.map((service) => {
                    const cfg = statusConfig[service.status];
                    const config = service.config as Record<string, string>;
                    const ip = config?.ip ?? "—";
                    const port = config?.port ? `:${config.port}` : "";
                    return (
                      <tr key={service.id}>
                        <td className="py-3 pr-4 font-medium">{service.name}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="neutral">{service.type}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-500">
                          {ip}{port}
                        </td>
                        <td className="py-3 text-gray-500">
                          {new Date(service.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3 text-right">
                          <Link href={`/services/${service.id}`}>
                            <Button variant="secondary" size="sm">Détails</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
