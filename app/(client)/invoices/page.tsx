import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Mes factures" };

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mes factures</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Historique de vos factures et paiements
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Factures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Aucune facture pour le moment
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                La facturation sera disponible en Phase 6 (intégration Stripe).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
