"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Package, Plus, Pencil, Power, PowerOff,
  Trash2, X, Loader2, Tag,
} from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  type: "VPS" | "MINECRAFT";
  providerId: string | null;
  provider: { id: string; name: string; provider: string } | null;
  priceMonthly: string;
  priceQuarterly: string | null;
  priceAnnual: string | null;
  provisionConfig: Record<string, unknown>;
  isActive: boolean;
}

interface ProductGroup {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  plans: { id: string }[];
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
  cores: "",
  memory: "",
  disk: "",
  storagePool: "",
  templateVmid: "",
  node: "",
};

function buildProvisionConfig(fields: ProvisionFields): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (fields.cores) config.cores = parseInt(fields.cores) || undefined;
  if (fields.memory) config.memory = parseInt(fields.memory) || undefined;
  if (fields.disk) config.disk = parseInt(fields.disk) || undefined;
  if (fields.storagePool) config.storagePool = fields.storagePool;
  if (fields.templateVmid) config.templateVmid = parseInt(fields.templateVmid) || undefined;
  if (fields.node) config.node = fields.node;
  // Remove undefined values
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

export default function ProductGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<ProductGroup | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Plan form state
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState<"VPS" | "MINECRAFT">("VPS");
  const [planProvider, setPlanProvider] = useState("");
  const [planPriceMonthly, setPlanPriceMonthly] = useState("");
  const [planPriceQuarterly, setPlanPriceQuarterly] = useState("");
  const [planPriceAnnual, setPlanPriceAnnual] = useState("");
  const [provisionFields, setProvisionFields] = useState<ProvisionFields>(emptyProvision);

  const loadData = useCallback(async () => {
    try {
      const [plansRes, productsRes, providersRes] = await Promise.all([
        fetch(`/api/admin/products/${groupId}/plans`).then((r) => r.json()),
        fetch("/api/admin/products").then((r) => r.json()),
        fetch("/api/admin/providers").then((r) => r.json()),
      ]);

      setPlans(plansRes.data ?? []);

      const allProducts: ProductGroup[] = productsRes.data ?? [];
      const found = allProducts.find((p) => p.id === groupId) ?? null;
      setGroup(found);

      setProviders(Array.isArray(providersRes) ? providersRes : []);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openAddPlan() {
    setEditPlanId(null);
    setPlanName("");
    setPlanType("VPS");
    setPlanProvider("");
    setPlanPriceMonthly("");
    setPlanPriceQuarterly("");
    setPlanPriceAnnual("");
    setProvisionFields(emptyProvision);
    setModalOpen(true);
  }

  function openEditPlan(plan: Plan) {
    setEditPlanId(plan.id);
    setPlanName(plan.name);
    setPlanType(plan.type);
    setPlanProvider(plan.providerId ?? "");
    setPlanPriceMonthly(plan.priceMonthly);
    setPlanPriceQuarterly(plan.priceQuarterly ?? "");
    setPlanPriceAnnual(plan.priceAnnual ?? "");
    setProvisionFields(parseProvisionConfig(plan.provisionConfig));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function setProvField(key: keyof ProvisionFields, value: string) {
    setProvisionFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSavePlan() {
    if (!planName.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (!planPriceMonthly) {
      toast.error("Le prix mensuel est requis");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: planName.trim(),
        type: planType,
        providerId: planProvider || null,
        priceMonthly: parseFloat(planPriceMonthly),
        priceQuarterly: planPriceQuarterly ? parseFloat(planPriceQuarterly) : null,
        priceAnnual: planPriceAnnual ? parseFloat(planPriceAnnual) : null,
        provisionConfig: buildProvisionConfig(provisionFields),
      };

      let res: Response;
      if (editPlanId) {
        res = await fetch(`/api/admin/plans/${editPlanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/products/${groupId}/plans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");

      await loadData();
      toast.success(editPlanId ? "Produit mis à jour" : "Produit créé");
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePlan(plan: Plan) {
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

  async function handleDeletePlan(planId: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      if (data.data?.deactivated) {
        setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, isActive: false } : p)));
        toast.info("Produit désactivé (des commandes existent)");
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
        toast.success("Produit supprimé");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Groupe introuvable.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.push("/admin/products")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Retour au catalogue
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push("/admin/products")}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Catalogue
        </button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="font-medium text-gray-900 dark:text-white">{group.name}</span>
      </div>

      {/* Group header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{group.name}</h2>
              <Badge variant={group.isActive ? "success" : "neutral"} className="text-xs">
                {group.isActive ? "Actif" : "Désactivé"}
              </Badge>
            </div>
            {group.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{group.description}</p>
            )}
          </div>
        </div>
        <Button onClick={openAddPlan} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau produit
        </Button>
      </div>

      {/* Plan modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {editPlanId ? "Modifier le produit" : "Nouveau produit"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
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
                      Prix mensuel (€) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planPriceMonthly}
                      onChange={(e) => setPlanPriceMonthly(e.target.value)}
                      placeholder="9.99"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Prix trimestriel (€)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planPriceQuarterly}
                      onChange={(e) => setPlanPriceQuarterly(e.target.value)}
                      placeholder="27.99"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Prix annuel (€)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planPriceAnnual}
                      onChange={(e) => setPlanPriceAnnual(e.target.value)}
                      placeholder="99.99"
                    />
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Coeurs CPU
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={provisionFields.cores}
                      onChange={(e) => setProvField("cores", e.target.value)}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      RAM (MB)
                    </label>
                    <Input
                      type="number"
                      min="128"
                      value={provisionFields.memory}
                      onChange={(e) => setProvField("memory", e.target.value)}
                      placeholder="2048"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Disque (Go)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={provisionFields.disk}
                      onChange={(e) => setProvField("disk", e.target.value)}
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Pool stockage
                    </label>
                    <Input
                      value={provisionFields.storagePool}
                      onChange={(e) => setProvField("storagePool", e.target.value)}
                      placeholder="local-lvm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Template VMID
                    </label>
                    <Input
                      type="number"
                      min="100"
                      value={provisionFields.templateVmid}
                      onChange={(e) => setProvField("templateVmid", e.target.value)}
                      placeholder="9000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Noeud Proxmox
                    </label>
                    <Input
                      value={provisionFields.node}
                      onChange={(e) => setProvField("node", e.target.value)}
                      placeholder="pve"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-2xl">
              <Button variant="secondary" size="sm" onClick={closeModal}>Annuler</Button>
              <Button size="sm" onClick={handleSavePlan} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {editPlanId ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Plans list */}
      {plans.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <Tag className="h-6 w-6 text-gray-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Aucun produit</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Ajoutez des produits à ce groupe.
          </p>
          <Button onClick={openAddPlan} size="sm" variant="secondary">
            <Plus className="h-4 w-4 mr-1.5" />
            Nouveau produit
          </Button>
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
                    <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {plan.priceMonthly} €/mois
                      </span>
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
                      onClick={() => openEditPlan(plan)}
                      title="Modifier"
                      className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleTogglePlan(plan)}
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
                      onClick={() => handleDeletePlan(plan.id)}
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
