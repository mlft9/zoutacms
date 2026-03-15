"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Package, Loader2, X, CheckCircle2, Server } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  type: "VPS" | "MINECRAFT";
  priceMonthly: string;
  priceQuarterly: string | null;
  priceAnnual: string | null;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  plans: Plan[];
}

type BillingCycle = "MONTHLY" | "QUARTERLY" | "ANNUAL";

const BILLING_LABELS: Record<BillingCycle, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  ANNUAL: "Annuel",
};

const TYPE_COLORS: Record<string, string> = {
  VPS: "bg-blue-500",
  MINECRAFT: "bg-green-500",
};

export default function CatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form state
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [hostname, setHostname] = useState("");
  const [rootPassword, setRootPassword] = useState("");
  const [sshKey, setSshKey] = useState("");
  const [notes, setNotes] = useState("");
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    fetch("/api/client/catalog")
      .then((r) => r.json())
      .then((d) => setProducts(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  function openOrder(product: Product, plan: Plan) {
    setSelectedProduct(product);
    setSelectedPlan(plan);
    setBillingCycle("MONTHLY");
    setHostname("");
    setRootPassword("");
    setSshKey("");
    setNotes("");
  }

  function closeModal() {
    setSelectedPlan(null);
    setSelectedProduct(null);
  }

  function getPrice(plan: Plan, cycle: BillingCycle): string {
    if (cycle === "QUARTERLY" && plan.priceQuarterly) return plan.priceQuarterly;
    if (cycle === "ANNUAL" && plan.priceAnnual) return plan.priceAnnual;
    return plan.priceMonthly;
  }

  async function handleOrder() {
    if (!selectedPlan) return;
    setOrdering(true);
    try {
      const res = await fetch("/api/client/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          hostname,
          rootPassword,
          sshKey: sshKey || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) {
          toast.error("Vous devez être connecté pour commander");
          router.push("/login");
          return;
        }
        const details = data.error?.details?.fieldErrors;
        const firstError = details ? Object.values(details).flat()[0] as string : data.error?.message;
        throw new Error(firstError ?? "Erreur");
      }
      toast.success("Commande créée — une facture a été générée");
      closeModal();
      router.push("/orders");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setOrdering(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ShoppingBag className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Catalogue</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choisissez un produit pour passer votre commande.
        </p>
      </div>

      {/* Order modal */}
      {selectedPlan && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Commander</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedProduct.name} — {selectedPlan.name}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Billing cycle */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Cycle de facturation
                </label>
                <div className="flex flex-col gap-2">
                  {(["MONTHLY", "QUARTERLY", "ANNUAL"] as BillingCycle[]).map((cycle) => {
                    const available =
                      cycle === "MONTHLY" ||
                      (cycle === "QUARTERLY" && !!selectedPlan.priceQuarterly) ||
                      (cycle === "ANNUAL" && !!selectedPlan.priceAnnual);
                    if (!available) return null;
                    return (
                      <label
                        key={cycle}
                        className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 cursor-pointer transition-colors ${
                          billingCycle === cycle
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input type="radio" name="billing" value={cycle} checked={billingCycle === cycle} onChange={() => setBillingCycle(cycle)} className="sr-only" />
                          <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${billingCycle === cycle ? "border-blue-500" : "border-gray-300"}`}>
                            {billingCycle === cycle && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{BILLING_LABELS[cycle]}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {getPrice(selectedPlan, cycle)} €
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Cloud-init config */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Configuration du serveur
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Hostname <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="mon-serveur"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">Lettres, chiffres et tirets uniquement</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Mot de passe root <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={rootPassword}
                    onChange={(e) => setRootPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Clé SSH publique (optionnel)
                  </label>
                  <textarea
                    value={sshKey}
                    onChange={(e) => setSshKey(e.target.value)}
                    rows={2}
                    placeholder="ssh-rsa AAAA..."
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-mono text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Note (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Informations supplémentaires..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
                />
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                Une facture sera générée immédiatement. Vous avez 24h pour effectuer le paiement.
              </p>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-2xl">
              <Button variant="secondary" size="sm" onClick={closeModal}>Annuler</Button>
              <Button
                size="sm"
                onClick={handleOrder}
                disabled={ordering || !hostname || !rootPassword}
              >
                {ordering ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                Confirmer la commande
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <Package className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">Aucun produit disponible</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Le catalogue sera disponible prochainement.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
              <div className={`h-2 w-full ${TYPE_COLORS[product.plans[0]?.type ?? ""] ?? "bg-gray-400"}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{product.name}</h3>
                  {product.plans[0]?.type && (
                    <Badge variant="info" className="text-xs ml-2 flex-shrink-0">{product.plans[0].type}</Badge>
                  )}
                </div>
                {product.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{product.description}</p>
                )}
                {product.plans.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Aucun produit disponible</p>
                ) : (
                  <div className="flex flex-col gap-2 mt-3">
                    {product.plans.map((plan) => (
                      <div key={plan.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            à partir de {plan.priceMonthly} €/mois
                          </p>
                        </div>
                        <Button size="sm" onClick={() => openOrder(product, plan)} variant="primary">
                          Commander
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
