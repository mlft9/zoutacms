"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "EXPIRED";
  dueDate: string;
  paidAt: string | null;
  description: string | null;
  createdAt: string;
  service: { id: string; name: string; type: string } | null;
  order: { id: string; billingCycle: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente de paiement",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
  EXPIRED: "Expirée",
};

const STATUS_VARIANTS: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mes factures</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Historique de vos factures et paiements
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Aucune facture pour le moment
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Vos factures apparaîtront ici dès que vous passez une commande.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">N° Facture</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Échéance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payée le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {inv.service?.name ?? inv.description ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        {inv.amount} €
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[inv.status]}>
                          {STATUS_LABELS[inv.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(inv.dueDate).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("fr-FR") : "—"}
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
