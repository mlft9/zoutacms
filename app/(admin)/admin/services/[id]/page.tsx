"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ServiceStatus = "ACTIVE" | "SUSPENDED" | "PENDING" | "TERMINATED";
type ServiceType = "VPS" | "MINECRAFT";

interface Service {
  id: string;
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
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

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    status: "PENDING" as ServiceStatus,
    ram: "",
    cpu: "",
    slots: "",
    ip: "",
    port: "",
  });

  const fetchService = async () => {
    const res = await fetch(`/api/admin/services/${id}`);
    const json = await res.json();
    if (json.success) {
      const s: Service = json.data;
      setService(s);
      const cfg = s.config;
      setForm({
        name: s.name,
        status: s.status,
        ram: cfg.ram != null ? String(cfg.ram) : "",
        cpu: cfg.cpu != null ? String(cfg.cpu) : "",
        slots: cfg.slots != null ? String(cfg.slots) : "",
        ip: cfg.ip != null ? String(cfg.ip) : "",
        port: cfg.port != null ? String(cfg.port) : "",
      });
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchService(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const config: Record<string, string | number> = {};
    if (form.ram) config.ram = parseInt(form.ram);
    if (form.cpu) config.cpu = parseInt(form.cpu);
    if (form.slots) config.slots = parseInt(form.slots);
    if (form.ip) config.ip = form.ip;
    if (form.port) config.port = parseInt(form.port);

    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, status: form.status, config }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Service mis à jour");
        fetchService();
      } else {
        toast.error(json.error?.message ?? "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Service supprimé");
        router.push("/admin/services");
      } else {
        toast.error(json.error?.message ?? "Erreur");
        setDeleteOpen(false);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const userName = (u: Service["user"]) =>
    u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email;

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-gray-500">Service introuvable</p>
        <Link href="/admin/services">
          <Button variant="secondary">Retour</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/services">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{service.name}</h2>
              <Badge variant={STATUS_VARIANT[service.status]}>{STATUS_LABEL[service.status]}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              Client :{" "}
              <Link
                href={`/admin/clients/${service.user.id}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {userName(service.user)}
              </Link>
            </p>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Supprimer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modifier le service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <div className="flex h-10 items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
                {service.type}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut</label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ServiceStatus })}
              >
                <option value="PENDING">En attente</option>
                <option value="ACTIVE">Actif</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="TERMINATED">Résilié</option>
              </Select>
            </div>
          </div>

          {/* Config */}
          <div>
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Configuration technique
            </p>
            <div className="grid grid-cols-2 gap-3">
              {service.type === "VPS" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">RAM (MB)</label>
                    <Input
                      type="number"
                      value={form.ram}
                      onChange={(e) => setForm({ ...form, ram: e.target.value })}
                      placeholder="2048"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">CPU (cœurs)</label>
                    <Input
                      type="number"
                      value={form.cpu}
                      onChange={(e) => setForm({ ...form, cpu: e.target.value })}
                      placeholder="2"
                      min={0}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Slots joueurs</label>
                  <Input
                    type="number"
                    value={form.slots}
                    onChange={(e) => setForm({ ...form, slots: e.target.value })}
                    placeholder="20"
                    min={0}
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Adresse IP</label>
                <Input
                  value={form.ip}
                  onChange={(e) => setForm({ ...form, ip: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Port</label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  placeholder="25565"
                  min={1}
                  max={65535}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-xs text-gray-400">
              Créé le {new Date(service.createdAt).toLocaleDateString("fr-FR")} ·
              Modifié le {new Date(service.updatedAt).toLocaleDateString("fr-FR")}
            </p>
            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le service ?"
        description={`Le service "${service.name}" sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
