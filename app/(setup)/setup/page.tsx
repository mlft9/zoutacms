"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, User, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StepPlatform } from "./steps/StepPlatform";
import { StepAdmin } from "./steps/StepAdmin";
import { StepComplete } from "./steps/StepComplete";

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { id: 1, label: "Plateforme", icon: Globe },
  { id: 2, label: "Administrateur", icon: User },
  { id: 3, label: "Terminé", icon: CheckCircle2 },
];

const stepTitles: Record<number, string> = {
  1: "Informations de la plateforme",
  2: "Compte administrateur",
  3: "Installation terminée",
};

const stepDescriptions: Record<number, string> = {
  1: "Donnez un nom à votre plateforme d'hébergement.",
  2: "Créez le premier compte administrateur.",
  3: "Votre plateforme est prête à l'emploi.",
};

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((json) => {
        if (!json.data?.needed) {
          router.replace("/login");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Installation de ZoutaCMS
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configurez votre plateforme en quelques étapes
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted
                      ? "border-blue-600 bg-blue-600 text-white"
                      : isCurrent
                        ? "border-blue-600 bg-white text-blue-600 dark:bg-gray-950 dark:text-blue-400"
                        : "border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    isCurrent
                      ? "text-blue-600 dark:text-blue-400"
                      : isCompleted
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    currentStep > step.id
                      ? "bg-blue-600"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {stepTitles[currentStep]}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {stepDescriptions[currentStep]}
          </p>
        </div>

        {currentStep === 1 && (
          <StepPlatform onNext={() => setCurrentStep(2)} />
        )}
        {currentStep === 2 && (
          <StepAdmin onNext={() => setCurrentStep(3)} />
        )}
        {currentStep === 3 && <StepComplete />}
      </Card>

      <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
        Étape {currentStep} sur {STEPS.length}
      </p>
    </div>
  );
}
