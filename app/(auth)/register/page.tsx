"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setGlobalError(null);
    setErrors({});

    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: "Les mots de passe ne correspondent pas." });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error?.code === "VALIDATION_ERROR" && data.error?.details) {
          setErrors(data.error.details);
        } else {
          setGlobalError(data.error?.message ?? "Une erreur s'est produite.");
        }
        return;
      }

      toast.success("Compte créé avec succès ! Vous pouvez vous connecter.");
      router.push("/login");
    } catch {
      setGlobalError("Une erreur réseau s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Créer un compte
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Rejoignez ZoutaCMS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {globalError && <Alert variant="error">{globalError}</Alert>}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prénom"
            type="text"
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            placeholder="Jean"
            autoComplete="given-name"
            error={errors.firstName}
          />
          <Input
            label="Nom"
            type="text"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            placeholder="Dupont"
            autoComplete="family-name"
            error={errors.lastName}
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="vous@exemple.com"
          autoComplete="email"
          required
          error={errors.email}
        />

        <Input
          label="Mot de passe"
          type="password"
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          error={errors.password}
          hint="8 caractères minimum, une majuscule, un chiffre et un caractère spécial"
        />

        <Input
          label="Confirmer le mot de passe"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => updateField("confirmPassword", e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Créer mon compte
        </Button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
          >
            Se connecter
          </Link>
        </p>
      </form>
    </Card>
  );
}
