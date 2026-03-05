"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StepAdminProps {
  onNext: () => void;
}

export function StepAdmin({ onNext }: StepAdminProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!form.firstName.trim()) newErrors.firstName = "Prénom requis";
    if (!form.lastName.trim()) newErrors.lastName = "Nom requis";
    if (!form.email.trim()) newErrors.email = "Email requis";
    if (!form.password) newErrors.password = "Mot de passe requis";
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const res = await fetch("/api/setup/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (json.success) {
      onNext();
    } else {
      setErrors({ global: json.error?.message ?? "Une erreur est survenue" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Créez le compte administrateur principal. Vous l&apos;utiliserez pour vous
        connecter à l&apos;espace d&apos;administration.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Prénom"
          value={form.firstName}
          onChange={(e) => setField("firstName", e.target.value)}
          error={errors.firstName}
          autoComplete="given-name"
        />
        <Input
          label="Nom"
          value={form.lastName}
          onChange={(e) => setField("lastName", e.target.value)}
          error={errors.lastName}
          autoComplete="family-name"
        />
      </div>

      <Input
        label="Adresse email"
        type="email"
        value={form.email}
        onChange={(e) => setField("email", e.target.value)}
        error={errors.email}
        autoComplete="email"
      />

      <Input
        label="Mot de passe"
        type="password"
        value={form.password}
        onChange={(e) => setField("password", e.target.value)}
        error={errors.password}
        hint="Min. 8 caractères, une majuscule, un chiffre, un caractère spécial"
        autoComplete="new-password"
      />

      <Input
        label="Confirmer le mot de passe"
        type="password"
        value={form.confirmPassword}
        onChange={(e) => setField("confirmPassword", e.target.value)}
        error={errors.confirmPassword}
        autoComplete="new-password"
      />

      {errors.global && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.global}</p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Créer le compte administrateur
      </Button>
    </form>
  );
}
