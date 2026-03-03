"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        totpCode: showTotp ? totpCode : undefined,
        loginType: "admin",
        redirect: false,
        callbackUrl: "/admin/dashboard",
      });

      if (!result) {
        const msg = "Une erreur inattendue s'est produite.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (result.error === "2FA_REQUIRED") {
        setShowTotp(true);
        setError(null);
        return;
      }

      if (result.error === "2FA_INVALID") {
        const msg = "Code 2FA invalide. Veuillez réessayer.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (result.error === "RATE_LIMITED") {
        const msg = "Trop de tentatives. Réessayez dans quelques minutes.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (result.error) {
        const msg = "Email ou mot de passe incorrect.";
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Connexion admin réussie !");
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      const msg = "Une erreur inattendue s'est produite.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 shadow-xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">Espace administrateur</h1>
        <p className="mt-1 text-sm text-gray-400">
          Connexion réservée aux comptes admin
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        {!showTotp ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemple.com"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-300">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Alert variant="info">
              Entrez le code de votre application d&apos;authentification.
            </Alert>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-300">
                Code 2FA
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="000000"
                autoComplete="one-time-code"
                required
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => { setShowTotp(false); setTotpCode(""); setError(null); }}
              className="text-xs text-gray-400 hover:text-gray-300 text-left"
            >
              ← Retour
            </button>
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {showTotp ? "Vérifier" : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}
