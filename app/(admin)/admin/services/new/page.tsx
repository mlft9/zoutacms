"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Client { id: string; email: string; firstName: string | null; lastName: string | null }
interface Provider { id: string; name: string; provider: string; isActive: boolean }
interface VmTemplate { vmid: number; name: string }
interface StorageItem { id: string; type: string }

export default function NewServicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledClientId = searchParams.get("clientId") ?? "";

  const [clients, setClients] = useState<Client[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [vmTemplates, setVmTemplates] = useState<VmTemplate[]>([]);
  const [storageList, setStorageList] = useState<StorageItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "VPS" as "VPS" | "MINECRAFT",
    userId: prefilledClientId,
    providerId: "",
    // Proxmox cloud-init
    templateVmid: "",
    vmid: "",
    ram: "",
    cpu: "",
    storage: "",
    storagePool: "",
    bridge: "",
    ipConfig: "dhcp",
    staticIp: "",
    staticGw: "",
    ciuser: "",
    cipassword: "",
    sshkeys: "",
    // Manual (no provider)
    slots: "",
    ip: "",
    port: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load clients + providers
  useEffect(() => {
    fetch("/api/admin/clients?limit=100")
      .then((r) => r.json())
      .then((j) => { if (j.success) setClients(j.data.clients); })
      .finally(() => setLoadingClients(false));
    fetch("/api/admin/providers")
      .then((r) => r.json())
      .then((d) => setProviders(Array.isArray(d) ? d.filter((p: Provider) => p.isActive) : []));
  }, []);

  // Load VM templates + storage when provider selected
  useEffect(() => {
    if (!form.providerId) {
      setVmTemplates([]);
      setStorageList([]);
      setForm((f) => ({ ...f, templateVmid: "", storagePool: "" }));
      return;
    }
    setLoadingResources(true);
    setVmTemplates([]);
    setStorageList([]);
    setForm((f) => ({ ...f, templateVmid: "", storagePool: "" }));

    const id = form.providerId;
    Promise.all([
      fetch(`/api/admin/providers/${id}/resources?type=templates`).then((r) => r.json()),
      fetch(`/api/admin/providers/${id}/resources?type=storage`).then((r) => r.json()),
    ])
      .then(([tpl, sto]) => {
        setVmTemplates(tpl.templates ?? []);
        setStorageList(sto.storage ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingResources(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.providerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!form.userId) { setErrors({ userId: "Veuillez sélectionner un client" }); return; }

    const config: Record<string, unknown> = {};

    if (form.providerId) {
      if (!form.templateVmid) { setErrors({ templateVmid: "Choisissez un template VM" }); return; }
      config.templateVmid = parseInt(form.templateVmid);
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
      if (form.ram) config.ram = parseInt(form.ram);
      if (form.cpu) config.cpu = parseInt(form.cpu);
      if (form.storage) config.storage = parseInt(form.storage);
      if (form.slots) config.slots = parseInt(form.slots);
      if (form.ip) config.ip = form.ip;
      if (form.port) config.port = parseInt(form.port);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          status: "PENDING",
          userId: form.userId,
          config,
          ...(form.providerId ? { providerId: form.providerId } : {}),
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
      setSubmitting(false);
    }
  };

  const clientName = (c: Client) =>
    c.firstName || c.lastName ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : c.email;

  const hasProvider = !!form.providerId;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/admin/services">
          <Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nouveau service</h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Informations du service</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.global && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errors.global}
              </p>
            )}

            {/* Nom */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom du service</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: VPS Pro, Serveur Minecraft…" required />
            </div>

            {/* Type + Client */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "VPS" | "MINECRAFT" })}>
                  <option value="VPS">VPS</option>
                  <option value="MINECRAFT">Minecraft</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                <Select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} error={errors.userId} disabled={loadingClients}>
                  <option value="">Sélectionner…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{clientName(c)} — {c.email}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Provider */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Provider <span className="text-gray-400 font-normal">(optionnel — active le provisionnement auto)</span>
              </label>
              <Select value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })}>
                <option value="">Manuel — pas de provisionnement</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.provider})</option>
                ))}
              </Select>
            </div>

            {/* ── Configuration Proxmox cloud-init ── */}
            {hasProvider && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Configuration Proxmox</p>
                  {loadingResources && <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />}
                </div>

                {/* Template VM */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Template cloud-init</label>
                  {vmTemplates.length > 0 ? (
                    <Select value={form.templateVmid} onChange={(e) => setForm({ ...form, templateVmid: e.target.value })} error={errors.templateVmid}>
                      <option value="">— Choisir un template —</option>
                      {vmTemplates.map((t) => (
                        <option key={t.vmid} value={t.vmid}>{t.name} (VM {t.vmid})</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      value={form.templateVmid}
                      onChange={(e) => setForm({ ...form, templateVmid: e.target.value })}
                      placeholder={loadingResources ? "Chargement…" : "VMID du template (ex: 9000)"}
                      disabled={loadingResources}
                    />
                  )}
                  {vmTemplates.length === 0 && !loadingResources && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">Aucun template trouvé. Créez un template cloud-init dans Proxmox et cochez &quot;Convertir en template&quot;.</p>
                  )}
                </div>

                {/* VM ID + Pool stockage */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      VM ID <span className="text-gray-400 font-normal">(auto si vide)</span>
                    </label>
                    <Input type="number" value={form.vmid} onChange={(e) => setForm({ ...form, vmid: e.target.value })} placeholder="auto" min={100} />
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
                      <Input value={form.storagePool} onChange={(e) => setForm({ ...form, storagePool: e.target.value })} placeholder="local-lvm" disabled={loadingResources} />
                    )}
                  </div>
                </div>

                {/* RAM + CPU + Disque */}
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

                {/* Réseau */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Bridge réseau <span className="text-gray-400 font-normal">(défaut : vmbr0)</span>
                    </label>
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

                {/* Cloud-init */}
                <div className="border-t border-orange-200 dark:border-orange-800 pt-3 space-y-3">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Cloud-init</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Utilisateur <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <Input value={form.ciuser} onChange={(e) => setForm({ ...form, ciuser: e.target.value })} placeholder="ubuntu" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Mot de passe <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <Input type="password" value={form.cipassword} onChange={(e) => setForm({ ...form, cipassword: e.target.value })} placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Clé SSH publique <span className="text-gray-400 font-normal">(optionnel)</span>
                    </label>
                    <Input value={form.sshkeys} onChange={(e) => setForm({ ...form, sshkeys: e.target.value })} placeholder="ssh-rsa AAAA… ou ssh-ed25519 AAAA…" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Configuration manuelle (sans provider) ── */}
            {!hasProvider && (
              <div className="pt-2 space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Configuration technique</p>
                <div className="grid grid-cols-2 gap-3">
                  {form.type === "VPS" ? (
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

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={submitting}>Créer le service</Button>
              <Link href="/admin/services"><Button type="button" variant="ghost">Annuler</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
