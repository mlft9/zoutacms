"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/** Sign in against the admin-auth NextAuth instance (separate cookie). */
async function adminSignIn(credentials: {
  email: string;
  password: string;
  loginType: string;
  totpCode?: string;
}): Promise<{ ok: boolean; error?: string }> {
  // 1. Get CSRF token from the admin-auth instance
  const csrfRes = await fetch("/api/admin-auth/csrf");
  const { csrfToken } = await csrfRes.json();

  // 2. POST to credentials callback
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl: "/admin/dashboard",
    json: "true",
    email: credentials.email,
    password: credentials.password,
    loginType: credentials.loginType,
    ...(credentials.totpCode ? { totpCode: credentials.totpCode } : {}),
  });

  const res = await fetch("/api/admin-auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();

  if (!res.ok || !data.url || data.error) {
    return { ok: false, error: data.error ?? "UNKNOWN" };
  }

  // NextAuth returns the callback URL on success; a redirect to /api/admin-auth/error on failure
  if (data.url?.includes("/api/admin-auth/error") || data.url?.includes("/admin/login")) {
    return { ok: false, error: data.error ?? "CREDENTIALS" };
  }

  return { ok: true };
}

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

    let success = false;
    try {
      // Step 1: Pre-validate credentials (check 2FA requirement without creating session)
      if (!showTotp) {
        const checkRes = await fetch("/api/auth/check-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, loginType: "admin" }),
        });

        const checkData = await checkRes.json();

        if (!checkRes.ok) {
          const msg =
            checkData?.error?.code === "RATE_LIMITED"
              ? "Trop de tentatives. Réessayez dans quelques minutes."
              : checkData?.error?.message || "Email ou mot de passe incorrect.";
          setError(msg);
          toast.error(msg);
          return;
        }

        if (checkData.data?.requires2FA) {
          setShowTotp(true);
          return;
        }
      }

      // Step 2: Sign in via admin-auth (sets admin session cookie, leaves client cookie intact)
      const result = await adminSignIn({
        email,
        password,
        loginType: "admin",
        totpCode: showTotp ? totpCode : undefined,
      });

      if (!result.ok) {
        const errorMessages: Record<string, string> = {
          "2FA_INVALID": "Code 2FA invalide. Veuillez réessayer.",
          "RATE_LIMITED": "Trop de tentatives. Réessayez dans quelques minutes.",
          "NOT_ADMIN": "Accès réservé aux administrateurs.",
        };
        const msg = errorMessages[result.error ?? ""] || "Email ou mot de passe incorrect.";
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Connexion admin réussie !");
      success = true;
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      const msg = "Une erreur inattendue s'est produite.";
      setError(msg);
      toast.error(msg);
    } finally {
      if (!success) setLoading(false);
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
