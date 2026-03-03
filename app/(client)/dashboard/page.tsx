import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Server, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mon espace" };

export default async function ClientDashboardPage() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? session?.user?.email;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bonjour, {name} 👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Bienvenue sur votre espace ZoutaCMS
        </p>
      </div>

      {/* Empty states for Phase 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-600" />
              <CardTitle>Mes services</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Server className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aucun service pour le moment
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Vos services apparaîtront ici
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle>Mes factures</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aucune facture pour le moment
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Disponible en Phase 6
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <CardTitle>Mon profil</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gérez vos informations personnelles et la sécurité de votre
                compte.
              </p>
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  Gérer mon profil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
