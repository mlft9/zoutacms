"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Order {
  id: string;
  status: "AWAITING_PAYMENT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  billingCycle: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  notes: string | null;
  hostname: string | null;
  expiresAt: string | null;
  createdAt: string;
  plan: {
    id: string;
    name: string;
    priceMonthly: string;
    priceQuarterly: string | null;
    priceAnnual: string | null;
    product: { id: string; name: string; type: string };
  };
  service: { id: string; name: string; status: string } | null;
  invoices: { id: string; status: string; amount: string; dueDate: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: "En attente de paiement",
  PENDING: "Payée — validation en cours",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  CANCELLED: "Annulée",
};

const STATUS_VARIANTS: Record<string, "warning" | "success" | "danger" | "neutral" | "info"> = {
  AWAITING_PAYMENT: "info",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

const BILLING_LABELS: Record<string, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  ANNUAL: "Annuel",
};

export default function OrdersClientPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(id: string) {
    if (!confirm("Annuler cette commande ?")) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/client/orders/${id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "CANCELLED" } : o)));
      toast.success("Commande annulée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCancellingId(null);
    }
  }

  function getPrice(order: Order): string {
    if (order.billingCycle === "QUARTERLY" && order.plan.priceQuarterly) return order.plan.priceQuarterly;
    if (order.billingCycle === "ANNUAL" && order.plan.priceAnnual) return order.plan.priceAnnual;
    return order.plan.priceMonthly;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mes commandes</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Suivez l&apos;état de vos commandes
          </p>
        </div>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Catalogue
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <ClipboardList className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Aucune commande</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Parcourez le catalogue pour passer votre première commande.
                </p>
              </div>
              <Link href="/catalog" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ShoppingBag className="h-4 w-4" />
                Voir le catalogue
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produit / Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hostname</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cycle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prix</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{order.plan.product.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{order.plan.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-300">
                        {order.hostname ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {BILLING_LABELS[order.billingCycle]}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {getPrice(order)} €
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                        {order.status === "AWAITING_PAYMENT" && order.expiresAt && (
                          <p className="text-xs text-amber-500 mt-0.5">
                            Expire le {new Date(order.expiresAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {order.status === "AWAITING_PAYMENT" ? (
                          <div className="flex items-center gap-2 justify-end">
                            <Link href="/invoices" className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:underline font-medium">
                              Payer la facture
                            </Link>
                            <button onClick={() => handleCancel(order.id)} disabled={cancellingId === order.id} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 hover:underline">
                              {cancellingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : "Annuler"}
                            </button>
                          </div>
                        ) : order.status === "PENDING" ? (
                          <button onClick={() => handleCancel(order.id)} disabled={cancellingId === order.id} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 hover:underline">
                            {cancellingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : "Annuler"}
                          </button>
                        ) : order.status === "APPROVED" && order.service ? (
                          <Link href={`/services/${order.service.id}`} className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:underline">
                            Voir le service
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
