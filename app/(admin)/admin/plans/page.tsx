"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tag, Plus, Pencil, Power, PowerOff, Trash2, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  productId: string;
  type: "VPS" | "MINECRAFT";
  isActive: boolean;
  priceMonthly: string;
  priceQuarterly: string | null;
  priceAnnual: string | null;
  provisionConfig: Record<string, unknown>;
  product: { id: string; name: string };
  provider: { id: string; name: string; provider: string } | null;
}

interface ProductGroup {
  id: string;
  name: string;
}

interface ProviderOption {
  id: string;
  name: string;
  provider: string;
}

interface ProvisionFields {
  cores: string;
  memory: string;
  disk: string;
  storagePool: string;
  templateVmid: string;
  node: string;
}

const emptyProvision: ProvisionFields = {
  cores: "", memory: "", disk: "", storagePool: "", templateVmid: "", node: "",
};

function buildProvisionConfig(fields: ProvisionFields): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (fields.cores) config.cores = parseInt(fields.cores) || undefined;
  if (fields.memory) config.memory = parseInt(fields.memory) || undefined;
  if (fields.disk) config.disk = parseInt(fields.disk) || undefined;
  if (fields.storagePool) config.storagePool = fields.storagePool;
  if (fields.templateVmid) config.templateVmid = parseInt(fields.templateVmid) || undefined;
  if (fields.node) config.node = fields.node;
  return Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined));
}

function parseProvisionConfig(cfg: Record<string, unknown>): ProvisionFields {
  return {
    cores: cfg.cores != null ? String(cfg.cores) : "",
    memory: cfg.memory != null ? String(cfg.memory) : "",
    disk: cfg.disk != null ? String(cfg.disk) : "",
    storagePool: typeof cfg.storagePool === "string" ? cfg.storagePool : "",
    templateVmid: cfg.templateVmid != null ? String(cfg.templateVmid) : "",
    node: typeof cfg.node === "string" ? cfg.node : "",
  };
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [planGroupId, setPlanGroupId] = useState("");
  const [planType, setPlanType] = useState<"VPS" | "MINECRAFT">("VPS");
  const [planProvider, setPlanProvider] = useState("");
  const [planPriceMonthly, setPlanPriceMonthly] = useState("");
  const [planPriceQuarterly, setPlanPriceQuarterly] = useState("");
  const [planPriceAnnual, setPlanPriceAnnual] = useState("");
  const [provisionFields, setProvisionFields] = useState<ProvisionFields>(emptyProvision);

  const loadAll = useCallback(async () => {
    try {
      const [plansRes, groupsRes, providersRes] = await Promise.all([
        fetch("/api/admin/plans").then((r) => r.json()),
        fetch("/api/admin/products").then((r) => r.json()),
        fetch("/api/admin/providers").then((r) => r.json()),
      ]);
      setPlans(plansRes.data ?? []);
      setGroups(groupsRes.data ?? []);
      setProviders(Array.isArray(providersRes) ? providersRes : []);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function openAdd() {
    setEditId(null);
    setPlanName("");
    setPlanGroupId(groups[0]?.id ?? "");
    setPlanType("VPS");
    setPlanProvider("");
    setPlanPriceMonthly("");
    setPlanPriceQuarterly("");
    setPlanPriceAnnual("");
    setProvisionFields(emptyProvision);
    setModalOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditId(plan.id);
    setPlanName(plan.name);
    setPlanGroupId(plan.productId);
    setPlanType(plan.type);
    setPlanProvider(plan.provider?.id ?? "");
    setPlanPriceMonthly(plan.priceMonthly);
    setPlanPriceQuarterly(plan.priceQuarterly ?? "");
    setPlanPriceAnnual(plan.priceAnnual ?? "");
    setProvisionFields(parseProvisionConfig(plan.provisionConfig));
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); }

  function setProvField(key: keyof ProvisionFields, value: string) {
    setProvisionFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!planName.trim()) { toast.error("Le nom est requis"); return; }
    if (!planGroupId) { toast.error("Sélectionnez un groupe"); return; }
    if (!planPriceMonthly) { toast.error("Le prix mensuel est requis"); return; }

    setSaving(true);
    try {
      const payload = {
        name: planName.trim(),
        productId: planGroupId,
        type: planType,
        providerId: planProvider || null,
        priceMonthly: parseFloat(planPriceMonthly),
        priceQuarterly: planPriceQuarterly ? parseFloat(planPriceQuarterly) : null,
        priceAnnual: planPriceAnnual ? parseFloat(planPriceAnnual) : null,
        provisionConfig: buildProvisionConfig(provisionFields),
      };

      let res: Response;
      if (editId) {
        res = await fetch(`/api/admin/plans/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/products/${planGroupId}/plans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");

      await loadAll();
      toast.success(editId ? "Produit mis à jour" : "Produit créé");
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(plan: Plan) {
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    const data = await res.json();
    if (data.success) {
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, isActive: data.data.isActive } : p)));
      toast.success(data.data.isActive ? "Produit activé" : "Produit désactivé");
    }
  }

  async function handleDelete(plan: Plan) {
    if (!confirm(`Supprimer le produit "${plan.name}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      if (data.data?.deactivated) {
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, isActive: false } : p)));
        toast.info("Produit désactivé (des commandes existent)");
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
        toast.success("Produit supprimé");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Produits</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {plans.length} produit{plans.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={openAdd} size="sm" disabled={groups.length === 0}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau produit
        </Button>
      </div>

      {groups.length === 0 && !loading && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Créez d&apos;abord un groupe de produits avant d&apos;ajouter des produits.
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {editId ? "Modifier le produit" : "Nouveau produit"}
              </h3>
              <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Nom <span className="text-red-500">*</span>
                </label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Ex: VPS Mini"
                />
              </div>

              {/* Group */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Groupe de produits <span className="text-red-500">*</span>
                </label>
                <select
                  value={planGroupId}
                  onChange={(e) => setPlanGroupId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Sélectionner un groupe</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Type + Provider */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as "VPS" | "MINECRAFT")}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="VPS">VPS</option>
                    <option value="MINECRAFT">Minecraft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Provider
                  </label>
                  <select
                    value={planProvider}
                    onChange={(e) => setPlanProvider(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">Aucun</option>
                    {providers.map((prov) => (
                      <option key={prov.id} value={prov.id}>{prov.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Tarification
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Mensuel (€) <span className="text-red-500">*</span>
                    </label>
                    <Input type="number" min="0" step="0.01" value={planPriceMonthly} onChange={(e) => setPlanPriceMonthly(e.target.value)} placeholder="9.99" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Trimestriel (€)</label>
                    <Input type="number" min="0" step="0.01" value={planPriceQuarterly} onChange={(e) => setPlanPriceQuarterly(e.target.value)} placeholder="27.99" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Annuel (€)</label>
                    <Input type="number" min="0" step="0.01" value={planPriceAnnual} onChange={(e) => setPlanPriceAnnual(e.target.value)} placeholder="99.99" />
                  </div>
                </div>
              </div>

              {/* Technical specs */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Spécifications techniques
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Coeurs CPU</label>
                    <Input type="number" min="1" value={provisionFields.cores} onChange={(e) => setProvField("cores", e.target.value)} placeholder="2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">RAM (MB)</label>
                    <Input type="number" min="128" value={provisionFields.memory} onChange={(e) => setProvField("memory", e.target.value)} placeholder="2048" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Disque (Go)</label>
                    <Input type="number" min="1" value={provisionFields.disk} onChange={(e) => setProvField("disk", e.target.value)} placeholder="20" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Pool stockage</label>
                    <Input value={provisionFields.storagePool} onChange={(e) => setProvField("storagePool", e.target.value)} placeholder="local-lvm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Template VMID</label>
                    <Input type="number" min="100" value={provisionFields.templateVmid} onChange={(e) => setProvField("templateVmid", e.target.value)} placeholder="9000" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Noeud Proxmox</label>
                    <Input value={provisionFields.node} onChange={(e) => setProvField("node", e.target.value)} placeholder="pve" />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-2xl">
              <Button variant="secondary" size="sm" onClick={closeModal}>Annuler</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {editId ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <Tag className="h-6 w-6 text-gray-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Aucun produit</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Ajoutez un produit et associez-le à un groupe.
          </p>
          {groups.length > 0 && (
            <Button onClick={openAdd} size="sm" variant="secondary">
              <Plus className="h-4 w-4 mr-1.5" />
              Nouveau produit
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`transition-opacity ${!plan.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{plan.name}</span>
                      <Badge variant="info" className="text-xs">{plan.type}</Badge>
                      <Badge variant={plan.isActive ? "success" : "neutral"} className="text-xs">
                        {plan.isActive ? "Actif" : "Désactivé"}
                      </Badge>
                      {plan.provider && (
                        <Badge variant="neutral" className="text-xs">{plan.provider.name}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Groupe : <span className="text-gray-600 dark:text-gray-300">{plan.product.name}</span>
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{plan.priceMonthly} €/mois</span>
                      {plan.priceQuarterly && <span>{plan.priceQuarterly} €/trim.</span>}
                      {plan.priceAnnual && <span>{plan.priceAnnual} €/an</span>}
                    </div>
                    {Object.keys(plan.provisionConfig).length > 0 && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {plan.provisionConfig.cores != null && (
                          <span className="text-xs text-gray-400">{String(plan.provisionConfig.cores)} vCPU</span>
                        )}
                        {plan.provisionConfig.memory != null && (
                          <span className="text-xs text-gray-400">{String(plan.provisionConfig.memory)} MB RAM</span>
                        )}
                        {plan.provisionConfig.disk != null && (
                          <span className="text-xs text-gray-400">{String(plan.provisionConfig.disk)} Go</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(plan)}
                      title="Modifier"
                      className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(plan)}
                      title={plan.isActive ? "Désactiver" : "Activer"}
                      className={`p-2 rounded-lg transition-colors ${
                        plan.isActive
                          ? "text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }`}
                    >
                      {plan.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      title="Supprimer"
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
