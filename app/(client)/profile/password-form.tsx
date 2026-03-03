"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Lock } from "lucide-react";

export function PasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.newPassword !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Une erreur s'est produite.");
        return;
      }

      toast.success("Mot de passe modifié !");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setError("Une erreur réseau s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-blue-600" />
          <CardTitle>Changer le mot de passe</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Mot de passe actuel"
            type="password"
            value={form.currentPassword}
            onChange={(e) =>
              setForm((p) => ({ ...p, currentPassword: e.target.value }))
            }
            autoComplete="current-password"
            required
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={form.newPassword}
            onChange={(e) =>
              setForm((p) => ({ ...p, newPassword: e.target.value }))
            }
            autoComplete="new-password"
            required
            hint="8 caractères minimum, une majuscule, un chiffre et un caractère spécial"
          />
          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((p) => ({ ...p, confirmPassword: e.target.value }))
            }
            autoComplete="new-password"
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              Modifier le mot de passe
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
