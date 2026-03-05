"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

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
      // Step 1: If we haven't checked 2FA yet, pre-validate credentials
      if (!showTotp) {
        const checkRes = await fetch("/api/auth/check-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, loginType: "client" }),
        });

        const checkData = await checkRes.json();

        if (!checkRes.ok) {
          const msg =
            checkData?.error?.code === "RATE_LIMITED"
              ? "Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes."
              : checkData?.error?.message || "Email ou mot de passe incorrect.";
          setError(msg);
          toast.error(msg);
          return;
        }

        // If 2FA is required, show the TOTP input and wait for code
        if (checkData.data?.requires2FA) {
          setShowTotp(true);
          return;
        }
      }

      // Step 2: Sign in with all credentials (including TOTP if required)
      const result = await signIn("credentials", {
        email,
        password,
        totpCode: showTotp ? totpCode : undefined,
        loginType: "client",
        redirect: false,
        callbackUrl,
      });

      if (!result) {
        const msg = "Une erreur inattendue s'est produite.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (result.error) {
        // Map known error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          "2FA_INVALID": "Code 2FA invalide. Veuillez réessayer.",
          "RATE_LIMITED": "Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.",
          "NOT_ADMIN": "Accès réservé aux administrateurs.",
        };
        const msg = errorMessages[result.error] || "Email ou mot de passe incorrect.";
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Connexion réussie !");
      success = true;
      router.push(callbackUrl);
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
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Connexion
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Accédez à votre espace ZoutaCMS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        {!showTotp ? (
          <>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
            />
            <div className="flex flex-col gap-1">
              <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Alert variant="info">
              Un code de vérification est requis. Ouvrez votre application
              d&apos;authentification et entrez le code à 6 chiffres.
            </Alert>
            <Input
              label="Code 2FA"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
            <button
              type="button"
              onClick={() => {
                setShowTotp(false);
                setTotpCode("");
                setError(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-left"
            >
              ← Retour à la connexion
            </button>
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {showTotp ? "Vérifier" : "Se connecter"}
        </Button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
          >
            S&apos;inscrire
          </Link>
        </p>
      </form>
    </Card>
  );
}
