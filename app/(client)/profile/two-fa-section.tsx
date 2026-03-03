"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldOff } from "lucide-react";
import Image from "next/image";

interface TwoFASectionProps {
  totpEnabled: boolean;
}

type Step = "idle" | "setup" | "verify" | "disable";

export function TwoFASection({ totpEnabled }: TwoFASectionProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSetup() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/2fa/setup", { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Erreur lors de la configuration.");
        return;
      }

      setQrCode(data.data.qrCode);
      setSecret(data.data.secret);
      setStep("setup");
    } catch {
      setError("Une erreur réseau s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndEnable() {
    if (!code || code.length !== 6) {
      setError("Veuillez entrer le code à 6 chiffres.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Code invalide.");
        return;
      }

      toast.success("Authentification à deux facteurs activée !");
      setStep("idle");
      setCode("");
      setQrCode(null);
      setSecret(null);
      router.refresh();
    } catch {
      setError("Une erreur réseau s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    if (!code || code.length !== 6) {
      setError("Veuillez entrer votre code 2FA pour confirmer.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Code invalide.");
        return;
      }

      toast.success("Authentification à deux facteurs désactivée.");
      setStep("idle");
      setCode("");
      router.refresh();
    } catch {
      setError("Une erreur réseau s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    setStep("idle");
    setCode("");
    setQrCode(null);
    setSecret(null);
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>Authentification à deux facteurs (2FA)</CardTitle>
          </div>
          <Badge variant={totpEnabled ? "success" : "neutral"}>
            {totpEnabled ? "Activée" : "Désactivée"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {step === "idle" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {totpEnabled
                ? "Votre compte est protégé par l'authentification à deux facteurs. Un code TOTP vous sera demandé à chaque connexion."
                : "Renforcez la sécurité de votre compte en activant l'authentification à deux facteurs via une application comme Google Authenticator ou Bitwarden."}
            </p>

            {totpEnabled ? (
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setStep("disable")}
                >
                  <ShieldOff className="h-4 w-4" />
                  Désactiver le 2FA
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={startSetup}
                loading={loading}
              >
                <ShieldCheck className="h-4 w-4" />
                Activer le 2FA
              </Button>
            )}
          </div>
        )}

        {step === "setup" && (
          <div className="flex flex-col gap-4">
            <Alert variant="info">
              Scannez le QR code avec votre application d&apos;authentification
              (Google Authenticator, Bitwarden, Authy, etc.), puis entrez le
              code à 6 chiffres pour confirmer.
            </Alert>

            {qrCode && (
              <div className="flex justify-center">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="QR Code 2FA" className="h-48 w-48" />
                </div>
              </div>
            )}

            {secret && (
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Clé manuelle (si vous ne pouvez pas scanner le QR code) :
                </p>
                <code className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  {secret}
                </code>
              </div>
            )}

            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Code de vérification"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="000000"
            />

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={cancel}>
                Annuler
              </Button>
              <Button
                variant="primary"
                loading={loading}
                onClick={verifyAndEnable}
              >
                Activer
              </Button>
            </div>
          </div>
        )}

        {step === "disable" && (
          <div className="flex flex-col gap-4">
            <Alert variant="warning">
              Pour désactiver le 2FA, entrez votre code d&apos;authentification
              actuel pour confirmer.
            </Alert>

            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Code 2FA actuel"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="000000"
            />

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={cancel}>
                Annuler
              </Button>
              <Button variant="danger" loading={loading} onClick={disable}>
                Désactiver
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
