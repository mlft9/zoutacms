"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export default function NewServicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledClientId = searchParams.get("clientId") ?? "";

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "VPS" as "VPS" | "MINECRAFT",
    status: "PENDING" as "ACTIVE" | "SUSPENDED" | "PENDING" | "TERMINATED",
    userId: prefilledClientId,
    // Config fields
    ram: "",
    cpu: "",
    slots: "",
    ip: "",
    port: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/clients?limit=100")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setClients(json.data.clients);
      })
      .finally(() => setLoadingClients(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!form.userId) {
      setErrors({ userId: "Veuillez sélectionner un client" });
      return;
    }

    // Build config from form fields
    const config: Record<string, string | number> = {};
    if (form.ram) config.ram = parseInt(form.ram);
    if (form.cpu) config.cpu = parseInt(form.cpu);
    if (form.slots) config.slots = parseInt(form.slots);
    if (form.ip) config.ip = form.ip;
    if (form.port) config.port = parseInt(form.port);

    setLoading(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          status: form.status,
          userId: form.userId,
          config,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Service créé");
        router.push(`/admin/services/${json.data.id}`);
      } else {
        toast.error(json.error?.message ?? "Erreur");
        setErrors({ global: json.error?.message ?? "Erreur" });
      }
    } finally {
      setLoading(false);
    }
  };

  const clientName = (c: Client) =>
    c.firstName || c.lastName ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : c.email;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/admin/services">
          <Button size="sm" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nouveau service</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du service</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.global && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errors.global}
              </p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nom du service
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: VPS Pro, Serveur Minecraft Survie..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <Select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "VPS" | "MINECRAFT" })}
                >
                  <option value="VPS">VPS</option>
                  <option value="MINECRAFT">Minecraft</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut</label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                >
                  <option value="PENDING">En attente</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="SUSPENDED">Suspendu</option>
                  <option value="TERMINATED">Résilié</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Client
              </label>
              <Select
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                error={errors.userId}
                disabled={loadingClients}
              >
                <option value="">Sélectionner un client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {clientName(c)} — {c.email}
                  </option>
                ))}
              </Select>
            </div>

            {/* Config technique */}
            <div className="pt-2">
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Configuration technique
              </p>
              <div className="grid grid-cols-2 gap-3">
                {form.type === "VPS" ? (
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

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading}>
                Créer le service
              </Button>
              <Link href="/admin/services">
                <Button type="button" variant="ghost">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
