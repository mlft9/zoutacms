"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROVIDER_META } from "@/lib/providers/registry";
import type { ProviderSlug } from "@/lib/providers/registry";
import { Plus, Trash2, TestTube, CheckCircle, XCircle, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { toast } from "sonner";

interface ProviderConfig {
  id: string;
  provider: string;
  name: string;
  config: Record<string, string>;
  isActive: boolean;
  createdAt: string;
}

type TestStatus = "idle" | "testing" | "ok" | "fail";

export default function PluginsPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderSlug>("proxmox");
  const [formName, setFormName] = useState("");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, TestStatus>>({});
  const [testMsg, setTestMsg] = useState<Record<string, string>>({});

  const meta = PROVIDER_META[selectedProvider];

  useEffect(() => {
    fetch("/api/admin/providers")
      .then((r) => r.json())
      .then((d) => setProviders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditId(null);
    setFormName("");
    setFormConfig({});
    setSelectedProvider("proxmox");
    setShowForm(true);
  }

  function openEdit(p: ProviderConfig) {
    setEditId(p.id);
    setFormName(p.name);
    setSelectedProvider(p.provider as ProviderSlug);
    setFormConfig({ ...p.config });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editId ? `/api/admin/providers/${editId}` : "/api/admin/providers";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, name: formName, config: formConfig }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      const saved = await res.json();
      if (editId) {
        setProviders((prev) => prev.map((p) => (p.id === editId ? saved : p)));
      } else {
        setProviders((prev) => [saved, ...prev]);
      }
      setShowForm(false);
      toast.success(editId ? "Provider mis à jour" : "Provider ajouté");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce provider ?")) return;
    await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
    setProviders((prev) => prev.filter((p) => p.id !== id));
    toast.success("Provider supprimé");
  }

  async function handleTest(id: string) {
    setTestStatus((s) => ({ ...s, [id]: "testing" }));
    setTestMsg((m) => ({ ...m, [id]: "" }));
    const res = await fetch(`/api/admin/providers/${id}/test`, { method: "POST" });
    const data = await res.json();
    setTestStatus((s) => ({ ...s, [id]: data.success ? "ok" : "fail" }));
    setTestMsg((m) => ({ ...m, [id]: data.message ?? "" }));
  }

  async function toggleActive(p: ProviderConfig) {
    const res = await fetch(`/api/admin/providers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const updated = await res.json();
    setProviders((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Plugins & Providers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configurez les providers de provisionnement automatique
          </p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un provider
        </Button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editId ? "Modifier le provider" : "Nouveau provider"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type de provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value as ProviderSlug);
                    setFormConfig({});
                  }}
                  disabled={!!editId}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {Object.entries(PROVIDER_META).map(([slug, m]) => (
                    <option key={slug} value={slug}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom affiché
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={`Ex: ${meta.label} Principal`}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {meta.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Input
                    type={field.type === "password" ? "password" : "text"}
                    value={formConfig[field.key] ?? ""}
                    onChange={(e) => setFormConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} loading={saving} size="sm">
                {editId ? "Enregistrer" : "Créer"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Providers list */}
      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-500">Aucun provider configuré.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {providers.map((p) => {
            const ts = testStatus[p.id] ?? "idle";
            const provMeta = PROVIDER_META[p.provider as ProviderSlug];
            return (
              <Card key={p.id}>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                          <Badge variant={p.isActive ? "success" : "neutral"}>
                            {p.isActive ? "Actif" : "Désactivé"}
                          </Badge>
                          <Badge variant="info">{provMeta?.label ?? p.provider}</Badge>
                        </div>
                        {testMsg[p.id] && (
                          <p className={`text-xs mt-1 ${ts === "ok" ? "text-green-600" : "text-red-500"}`}>
                            {testMsg[p.id]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTest(p.id)}
                        loading={ts === "testing"}
                      >
                        {ts === "ok" ? (
                          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                        ) : ts === "fail" ? (
                          <XCircle className="h-4 w-4 mr-1 text-red-500" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-1" />
                        )}
                        Tester
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => toggleActive(p)}>
                        {p.isActive ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronUp className="h-4 w-4 mr-1" />}
                        {p.isActive ? "Désactiver" : "Activer"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
