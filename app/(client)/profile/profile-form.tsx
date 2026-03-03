"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { User } from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email !== user.email ? form.email : undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Une erreur s'est produite.");
        return;
      }

      toast.success("Profil mis à jour !");
      router.refresh();
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
          <User className="h-5 w-5 text-blue-600" />
          <CardTitle>Informations personnelles</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              type="text"
              value={form.firstName}
              onChange={(e) =>
                setForm((p) => ({ ...p, firstName: e.target.value }))
              }
              placeholder="Jean"
            />
            <Input
              label="Nom"
              type="text"
              value={form.lastName}
              onChange={(e) =>
                setForm((p) => ({ ...p, lastName: e.target.value }))
              }
              placeholder="Dupont"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
