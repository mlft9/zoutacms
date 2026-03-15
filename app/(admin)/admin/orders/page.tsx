"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  status: "AWAITING_PAYMENT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  billingCycle: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  notes: string | null;
  hostname: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  plan: {
    id: string;
    name: string;
    priceMonthly: string;
    priceQuarterly: string | null;
    priceAnnual: string | null;
    product: { id: string; name: string; type: string };
  };
  service: { id: string; name: string; status: string } | null;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: "Paiement en attente",
  PENDING: "Payée — en attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  CANCELLED: "Annulée",
};

const ORDER_STATUS_VARIANTS: Record<string, "warning" | "success" | "danger" | "neutral" | "info"> = {
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const url = filter === "all" ? "/api/admin/orders" : `/api/admin/orders?status=${filter}`;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleApprove(id: string) {
    if (!confirm("Approuver cette commande ? Un service et une facture seront créés.")) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "APPROVED", service: data.data.service } : o))
      );
      toast.success("Commande approuvée — service et facture créés");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(id: string, status: string) {
    const msg = status === "APPROVED"
      ? "Cette commande est approuvée et possède un service actif.\nSupprimer la commande supprimera aussi le service associé.\nLes factures ne seront pas supprimées.\nContinuer ?"
      : "Supprimer définitivement cette commande ?\n(Les factures associées ne peuvent pas être supprimées — la commande sera refusée si des factures existent.)";
    if (!confirm(msg)) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast.success("Commande supprimée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Raison du refus (optionnel) :");
    if (reason === null) return; // annulé
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "REJECTED" } : o)));
      toast.success("Commande rejetée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProcessingId(null);
    }
  }

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const awaitingPaymentCount = orders.filter((o) => o.status === "AWAITING_PAYMENT").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Commandes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pendingCount > 0 ? `${pendingCount} payée${pendingCount > 1 ? "s" : ""} à valider` : awaitingPaymentCount > 0 ? `${awaitingPaymentCount} en attente de paiement` : "Aucune commande en attente"}
            </p>
          </div>
        </div>

        {/* Filtre */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">Toutes les commandes</option>
          <option value="AWAITING_PAYMENT">Paiement en attente</option>
          <option value="PENDING">Payées — à valider</option>
          <option value="APPROVED">Approuvées</option>
          <option value="REJECTED">Rejetées</option>
          <option value="CANCELLED">Annulées</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingCart className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune commande</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
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
                  {orders.map((order) => {
                    const price = order.billingCycle === "QUARTERLY" && order.plan.priceQuarterly
                      ? order.plan.priceQuarterly
                      : order.billingCycle === "ANNUAL" && order.plan.priceAnnual
                      ? order.plan.priceAnnual
                      : order.plan.priceMonthly;
                    const isProcessing = processingId === order.id;

                    return (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {order.user.firstName && order.user.lastName
                              ? `${order.user.firstName} ${order.user.lastName}`
                              : order.user.email}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{order.user.email}</div>
                        </td>
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
                          {price} €
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                          {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          {order.status === "PENDING" && (
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => handleApprove(order.id)}
                                disabled={isProcessing}
                                title="Approuver et provisionner"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 disabled:opacity-50 transition-colors"
                              >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                Approuver
                              </button>
                              <button
                                onClick={() => handleReject(order.id)}
                                disabled={isProcessing}
                                title="Rejeter"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Rejeter
                              </button>
                            </div>
                          )}
                          {order.status === "AWAITING_PAYMENT" && (
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => handleReject(order.id)}
                                disabled={isProcessing}
                                title="Annuler"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Annuler
                              </button>
                            </div>
                          )}
                          {!["PENDING", "AWAITING_PAYMENT"].includes(order.status) && (
                            <div className="flex items-center gap-1.5 justify-end">
                              {order.status === "APPROVED" && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Provisionné</span>
                              )}
                              <button
                                onClick={() => handleDelete(order.id, order.status)}
                                disabled={isProcessing}
                                title="Supprimer"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                              >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Supprimer
                              </button>
                            </div>
                          )}
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
