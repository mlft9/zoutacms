"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Trash2, RefreshCw, Play, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

type ServiceStatus =
  | "ACTIVE" | "SUSPENDED" | "PENDING" | "TERMINATED"
  | "PROVISIONING" | "PROVISIONING_FAILED" | "PROVISIONING_TIMEOUT"
  | "REQUIRES_MANUAL_CHECK" | "TERMINATING";

type ServiceType = "VPS" | "MINECRAFT";

interface Service {
  id: string;
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  config: Record<string, unknown>;
  externalId: string | null;
  provisionError: string | null;
  provisionAttempts: number;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  provider: { id: string; name: string; provider: string } | null;
}

const STATUS_LABEL: Record<ServiceStatus, string> = {
  ACTIVE: "Actif", SUSPENDED: "Suspendu", PENDING: "En attente", TERMINATED: "Résilié",
  PROVISIONING: "Provisionnement…", PROVISIONING_FAILED: "Échec",
  PROVISIONING_TIMEOUT: "Timeout", REQUIRES_MANUAL_CHECK: "Vérif. manuelle", TERMINATING: "Résiliation…",
};

const STATUS_VARIANT: Record<ServiceStatus, "success" | "warning" | "info" | "danger" | "neutral"> = {
  ACTIVE: "success", SUSPENDED: "warning", PENDING: "info", TERMINATED: "danger",
  PROVISIONING: "info", PROVISIONING_FAILED: "danger", PROVISIONING_TIMEOUT: "danger",
  REQUIRES_MANUAL_CHECK: "warning", TERMINATING: "neutral",
};

const EDITABLE_STATUSES: ServiceStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"];

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [storageList, setStorageList] = useState<{ id: string; type: string }[]>([]);

  const [form, setForm] = useState({
    name: "",
    status: "PENDING" as ServiceStatus,
    // Generic
    ram: "", cpu: "", storage: "", slots: "", ip: "", port: "",
    // Proxmox cloud-init
    templateVmid: "", vmid: "", storagePool: "", bridge: "",
    ipConfig: "dhcp", staticIp: "", staticGw: "",
    ciuser: "", cipassword: "", sshkeys: "",
  });

  const fetchService = useCallback(async () => {
    const res = await fetch(`/api/admin/services/${id}`);
    const json = await res.json();
    if (json.success) {
      const s: Service = json.data;
      setService(s);
      const c = s.config;
      const rawIp = c.ipConfig ? String(c.ipConfig) : "";
      const isStatic = rawIp.startsWith("ip=");
      setForm({
        name: s.name,
        status: EDITABLE_STATUSES.includes(s.status) ? s.status : "PENDING",
        ram: c.ram != null ? String(c.ram) : "",
        cpu: c.cpu != null ? String(c.cpu) : "",
        storage: c.storage != null ? String(c.storage) : "",
        slots: c.slots != null ? String(c.slots) : "",
        ip: c.ip != null ? String(c.ip) : "",
        port: c.port != null ? String(c.port) : "",
        templateVmid: c.templateVmid != null ? String(c.templateVmid) : "",
        vmid: c.vmid != null ? String(c.vmid) : "",
        storagePool: c.storagePool != null ? String(c.storagePool) : "",
        bridge: c.bridge != null ? String(c.bridge) : "",
        ipConfig: isStatic ? "static" : "dhcp",
        staticIp: isStatic ? rawIp.replace("ip=", "").split(",gw=")[0] : "",
        staticGw: rawIp.includes(",gw=") ? rawIp.split(",gw=")[1] : "",
        ciuser: c.ciuser != null ? String(c.ciuser) : "",
        cipassword: "",
        sshkeys: c.sshkeys != null ? String(c.sshkeys) : "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchService(); }, [fetchService]);

  // Load storage list when service with provider is loaded
  useEffect(() => {
    if (!service?.provider) return;
    fetch(`/api/admin/providers/${service.provider.id}/resources?type=storage`)
      .then((r) => r.json())
      .then((d) => { if (d.storage) setStorageList(d.storage); })
      .catch(() => {});
  }, [service?.provider?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (service?.status !== "PROVISIONING") return;
    const interval = setInterval(fetchService, 3000);
    return () => clearInterval(interval);
  }, [service?.status, fetchService]);

  const handleSave = async () => {
    setSaving(true);
    const config: Record<string, unknown> = {};

    if (service?.provider) {
      // Proxmox cloud-init fields
      if (form.templateVmid) config.templateVmid = parseInt(form.templateVmid);
      if (form.vmid) config.vmid = parseInt(form.vmid);
      if (form.ram) config.ram = parseInt(form.ram);
      if (form.cpu) config.cpu = parseInt(form.cpu);
      if (form.storage) config.storage = parseInt(form.storage);
      if (form.storagePool) config.storagePool = form.storagePool;
      if (form.bridge) config.bridge = form.bridge;
      config.ipConfig = form.ipConfig === "static" && form.staticIp
        ? `ip=${form.staticIp}${form.staticGw ? `,gw=${form.staticGw}` : ""}`
        : "dhcp";
      if (form.ciuser) config.ciuser = form.ciuser;
      if (form.cipassword) config.cipassword = form.cipassword;
      if (form.sshkeys) config.sshkeys = form.sshkeys;
    } else {
      // Manual
      if (form.ram) config.ram = parseInt(form.ram);
      if (form.cpu) config.cpu = parseInt(form.cpu);
      if (form.storage) config.storage = parseInt(form.storage);
      if (form.slots) config.slots = parseInt(form.slots);
      if (form.ip) config.ip = form.ip;
      if (form.port) config.port = parseInt(form.port);
    }

    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, status: form.status, config }),
      });
      const json = await res.json();
      if (json.success) { toast.success("Service mis à jour"); fetchService(); }
      else toast.error(json.error?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleProvision = async () => {
    setProvisioning(true);
    try {
      const res = await fetch(`/api/admin/services/${id}/provision`, { method: "POST" });
      const json = await res.json();
      if (json.success) { toast.success("Provisionnement démarré"); fetchService(); }
      else toast.error(json.error?.message ?? "Erreur");
    } finally {
      setProvisioning(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("Service supprimé"); router.push("/admin/services"); }
      else { toast.error(json.error?.message ?? "Erreur"); setDeleteOpen(false); }
    } finally {
      setDeleteLoading(false);
    }
  };

  const userName = (u: Service["user"]) =>
    u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email;

  if (loading) return (
    <div className="space-y-4 max-w-2xl">
      <Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" />
    </div>
  );

  if (!service) return (
    <div className="flex flex-col items-center gap-4 py-16">
      <p className="text-gray-500">Service introuvable</p>
      <Link href="/admin/services"><Button variant="secondary">Retour</Button></Link>
    </div>
  );

  const isProvisioning = service.status === "PROVISIONING";
  const isFailed = service.status === "PROVISIONING_FAILED" || service.status === "PROVISIONING_TIMEOUT";
  const canProvision = service.provider && (service.status === "PENDING" || isFailed);
  const hasProvider = !!service.provider;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/services">
            <Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{service.name}</h2>
              <Badge variant={STATUS_VARIANT[service.status]}>{STATUS_LABEL[service.status]}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              Client :{" "}
              <Link href={`/admin/clients/${service.user.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                {userName(service.user)}
              </Link>
              {service.provider && <span className="ml-2 text-gray-400">· {service.provider.name}</span>}
            </p>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />Supprimer
        </Button>
      </div>

      {/* Banners */}
      {isProvisioning && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Provisionnement en cours…</p>
            <p className="text-xs text-blue-500">La page se met à jour automatiquement.</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Provisionnement échoué — {service.provisionAttempts} tentative{service.provisionAttempts > 1 ? "s" : ""}
            </p>
            {service.provisionError && (
              <p className="mt-1 text-xs font-mono break-all text-red-600 dark:text-red-400">{service.provisionError}</p>
            )}
            {service.nextRetryAt && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Prochaine tentative : {new Date(service.nextRetryAt).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
          {canProvision && (
            <Button size="sm" onClick={handleProvision} loading={provisioning}>
              <RefreshCw className="h-3 w-3" />Relancer
            </Button>
          )}
        </div>
      )}

      {service.status === "ACTIVE" && service.externalId && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Service actif</p>
            <p className="text-xs text-green-600 dark:text-green-400">
              VM ID Proxmox : <span className="font-mono">{service.externalId}</span>
            </p>
          </div>
        </div>
      )}

      {canProvision && !isFailed && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
          <Play className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider : {service.provider!.name}</p>
            <p className="text-xs text-gray-500">Prêt à être provisionné.</p>
          </div>
          <Button size="sm" onClick={handleProvision} loading={provisioning}>
            <Play className="h-3 w-3" />Provisionner
          </Button>
        </div>
      )}

      {/* Edit form */}
      <Card>
        <CardHeader><CardTitle>Modifier le service</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceStatus })}>
                <option value="PENDING">En attente</option>
                <option value="ACTIVE">Actif</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="TERMINATED">Résilié</option>
              </Select>
            </div>
          </div>

          {/* Proxmox cloud-init config */}
          {hasProvider && service.type === "VPS" && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20 space-y-4">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Configuration Proxmox</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Template VMID</label>
                  <Input type="number" value={form.templateVmid} onChange={(e) => setForm({ ...form, templateVmid: e.target.value })} placeholder="9000" min={100} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">VM ID <span className="text-gray-400 font-normal">(auto si vide)</span></label>
                  <Input type="number" value={form.vmid} onChange={(e) => setForm({ ...form, vmid: e.target.value })} placeholder="auto" min={100} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">RAM (MB)</label>
                  <Input type="number" value={form.ram} onChange={(e) => setForm({ ...form, ram: e.target.value })} placeholder="1024" min={64} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">CPU (cœurs)</label>
                  <Input type="number" value={form.cpu} onChange={(e) => setForm({ ...form, cpu: e.target.value })} placeholder="1" min={1} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Disque (GB)</label>
                  <Input type="number" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} placeholder="20" min={1} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Pool de stockage</label>
                {storageList.length > 0 ? (
                  <Select value={form.storagePool} onChange={(e) => setForm({ ...form, storagePool: e.target.value })}>
                    <option value="">— Choisir —</option>
                    {storageList.map((s) => (
                      <option key={s.id} value={s.id}>{s.id} ({s.type})</option>
                    ))}
                  </Select>
                ) : (
                  <Input value={form.storagePool} onChange={(e) => setForm({ ...form, storagePool: e.target.value })} placeholder="local-lvm" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Bridge réseau <span className="text-gray-400 font-normal">(défaut : vmbr0)</span></label>
                  <Input value={form.bridge} onChange={(e) => setForm({ ...form, bridge: e.target.value })} placeholder="vmbr0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Configuration IP</label>
                  <Select value={form.ipConfig} onChange={(e) => setForm({ ...form, ipConfig: e.target.value })}>
                    <option value="dhcp">DHCP (automatique)</option>
                    <option value="static">IP statique</option>
                  </Select>
                </div>
              </div>

              {form.ipConfig === "static" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">IP / masque</label>
                    <Input value={form.staticIp} onChange={(e) => setForm({ ...form, staticIp: e.target.value })} placeholder="192.168.1.100/24" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Passerelle</label>
                    <Input value={form.staticGw} onChange={(e) => setForm({ ...form, staticGw: e.target.value })} placeholder="192.168.1.1" />
                  </div>
                </div>
              )}

              <div className="border-t border-orange-200 dark:border-orange-800 pt-3 space-y-3">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Cloud-init</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Utilisateur</label>
                    <Input value={form.ciuser} onChange={(e) => setForm({ ...form, ciuser: e.target.value })} placeholder="ubuntu" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Nouveau mot de passe <span className="text-gray-400 font-normal">(laisser vide = inchangé)</span></label>
                    <Input type="password" value={form.cipassword} onChange={(e) => setForm({ ...form, cipassword: e.target.value })} placeholder="••••••••" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Clé SSH publique</label>
                  <Input value={form.sshkeys} onChange={(e) => setForm({ ...form, sshkeys: e.target.value })} placeholder="ssh-ed25519 AAAA…" />
                </div>
              </div>
            </div>
          )}

          {/* Manual config (no provider) */}
          {!hasProvider && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Configuration technique</p>
              <div className="grid grid-cols-2 gap-3">
                {service.type === "VPS" ? (
                  <>
                    <div className="space-y-1"><label className="text-xs text-gray-500">RAM (MB)</label><Input type="number" value={form.ram} onChange={(e) => setForm({ ...form, ram: e.target.value })} placeholder="2048" /></div>
                    <div className="space-y-1"><label className="text-xs text-gray-500">CPU (cœurs)</label><Input type="number" value={form.cpu} onChange={(e) => setForm({ ...form, cpu: e.target.value })} placeholder="2" /></div>
                    <div className="space-y-1"><label className="text-xs text-gray-500">Disque (GB)</label><Input type="number" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} placeholder="20" /></div>
                    <div className="space-y-1"><label className="text-xs text-gray-500">Adresse IP</label><Input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.1" /></div>
                    <div className="space-y-1"><label className="text-xs text-gray-500">Port SSH</label><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="22" /></div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1"><label className="text-xs text-gray-500">Slots joueurs</label><Input type="number" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} placeholder="20" /></div>
                    <div className="space-y-1"><label className="text-xs text-gray-500">Adresse IP</label><Input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.1" /></div>
                    <div className="space-y-1"><label className="text-xs text-gray-500">Port</label><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="25565" /></div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-xs text-gray-400">
              Créé le {new Date(service.createdAt).toLocaleDateString("fr-FR")} ·
              Modifié le {new Date(service.updatedAt).toLocaleDateString("fr-FR")}
            </p>
            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" />Enregistrer
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
