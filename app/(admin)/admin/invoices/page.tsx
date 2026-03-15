"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "EXPIRED";
  dueDate: string;
  paidAt: string | null;
  description: string | null;
  createdAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  service: { id: string; name: string; type: string } | null;
  order: { id: string; billingCycle: string } | null;
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
  EXPIRED: "Expirée",
};

const INVOICE_STATUS_VARIANTS: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

export default function InvoicesAdminPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const url = filter === "all" ? "/api/admin/invoices" : `/api/admin/invoices?status=${filter}`;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => setInvoices(d.data ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleMarkPaid(id: string) {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: "PAID", paidAt: data.data.paidAt } : inv)));
      toast.success("Facture marquée comme payée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Annuler cette facture ?")) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: "CANCELLED" } : inv)));
      toast.success("Facture annulée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Factures</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {invoices.length} facture{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filtre */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">Toutes les factures</option>
          <option value="PENDING">En attente</option>
          <option value="PAID">Payées</option>
          <option value="OVERDUE">En retard</option>
          <option value="CANCELLED">Annulées</option>
          <option value="EXPIRED">Expirées</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune facture</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">N°</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Échéance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {invoices.map((inv) => {
                    const isProcessing = processingId === inv.id;
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {inv.user.firstName && inv.user.lastName
                              ? `${inv.user.firstName} ${inv.user.lastName}`
                              : inv.user.email}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{inv.user.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {inv.service?.name ?? inv.description ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          {inv.amount} €
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={INVOICE_STATUS_VARIANTS[inv.status]}>
                            {INVOICE_STATUS_LABELS[inv.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(inv.dueDate).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            {inv.status === "PENDING" || inv.status === "OVERDUE" ? (
                              <>
                                <button
                                  onClick={() => handleMarkPaid(inv.id)}
                                  disabled={isProcessing}
                                  title="Marquer comme payée"
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 disabled:opacity-50 transition-colors"
                                >
                                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                  Payée
                                </button>
                                <button
                                  onClick={() => handleCancel(inv.id)}
                                  disabled={isProcessing}
                                  title="Annuler"
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Annuler
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </div>
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
