"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StepComplete() {
  const [loading, setLoading] = useState(false);

  async function handleFinish() {
    setLoading(true);
    await fetch("/api/setup/complete", { method: "POST" });
    // Full reload to pick up the new cookie
    window.location.href = "/admin/login";
  }

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Installation terminée !
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Votre plateforme ZoutaCMS est prête. Vous pouvez maintenant vous
          connecter à l&apos;espace d&apos;administration avec les identifiants que
          vous venez de créer.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-left space-y-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Récapitulatif
        </p>
        <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            Plateforme personnalisée
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            Compte administrateur créé
          </li>
        </ul>
      </div>

      <Button onClick={handleFinish} loading={loading} className="w-full">
        Accéder à l&apos;administration
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
