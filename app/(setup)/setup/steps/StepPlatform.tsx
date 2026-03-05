"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StepPlatformProps {
  onNext: () => void;
}

export function StepPlatform({ onNext }: StepPlatformProps) {
  const [platformName, setPlatformName] = useState("ZoutaCMS");
  const [platformUrl, setPlatformUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!platformName.trim()) {
      setError("Le nom de la plateforme est requis");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/setup/platform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformName, platformUrl }),
    });
    const json = await res.json();
    setLoading(false);

    if (json.success) {
      onNext();
    } else {
      setError(json.error?.message ?? "Une erreur est survenue");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Personnalisez le nom de votre plateforme. Il apparaîtra dans l&apos;interface
        et les emails envoyés à vos clients.
      </p>

      <Input
        label="Nom de la plateforme"
        placeholder="ZoutaCMS"
        value={platformName}
        onChange={(e) => setPlatformName(e.target.value)}
        error={error && !platformUrl ? error : undefined}
        required
      />

      <Input
        label="URL de la plateforme (optionnel)"
        placeholder="https://panel.mondomaine.com"
        value={platformUrl}
        onChange={(e) => setPlatformUrl(e.target.value)}
        hint="Utilisée dans les emails pour générer des liens corrects"
        type="url"
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Continuer
      </Button>
    </form>
  );
}
