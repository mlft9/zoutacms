"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password, confirmPassword: form.confirmPassword }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Une erreur s'est produite.");
        return;
      }

      toast.success("Mot de passe réinitialisé avec succès !");
      router.push("/login");
    } catch {
      setError("Une erreur réseau s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <Alert variant="error">
          Lien de réinitialisation invalide ou manquant.{" "}
          <Link href="/forgot-password" className="underline">
            Demander un nouveau lien
          </Link>
        </Alert>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Nouveau mot de passe
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choisissez un nouveau mot de passe sécurisé.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Nouveau mot de passe"
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          hint="8 caractères minimum, une majuscule, un chiffre et un caractère spécial"
        />

        <Input
          label="Confirmer le mot de passe"
          type="password"
          value={form.confirmPassword}
          onChange={(e) =>
            setForm((p) => ({ ...p, confirmPassword: e.target.value }))
          }
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Réinitialiser le mot de passe
        </Button>
      </form>
    </Card>
  );
}
