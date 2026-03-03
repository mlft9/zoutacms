"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Une erreur s'est produite.");
        return;
      }

      setSent(true);
    } catch {
      setError("Une erreur réseau s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Email envoyé
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Si un compte existe avec l&apos;adresse <strong>{email}</strong>,
              vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400 font-medium"
          >
            Retour à la connexion
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mot de passe oublié
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          autoComplete="email"
          required
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Envoyer le lien
        </Button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          <Link
            href="/login"
            className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
          >
            ← Retour à la connexion
          </Link>
        </p>
      </form>
    </Card>
  );
}
