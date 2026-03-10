"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROVIDER_META } from "@/lib/providers/registry-meta";
import type { ProviderSlug } from "@/lib/providers/registry-meta";
import {
  Plus, Trash2, TestTube2, CheckCircle2, XCircle, Pencil,
  Server, Power, PowerOff, X, Wifi, WifiOff, Loader2,
} from "lucide-react";
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

const PROVIDER_COLORS: Record<string, string> = {
  proxmox: "bg-orange-500",
};

export default function PluginsPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderSlug>("proxmox");
  const [formName, setFormName] = useState("");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [authMethod, setAuthMethod] = useState("token");
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
    setAuthMethod("token");
    setShowForm(true);
  }

  function openEdit(p: ProviderConfig) {
    setEditId(p.id);
    setFormName(p.name);
    setSelectedProvider(p.provider as ProviderSlug);
    setFormConfig({ ...p.config });
    setAuthMethod(p.config.tokenId ? "token" : "userpass");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const cleanConfig = { ...formConfig };
      if (authMethod === "token") {
        delete cleanConfig.username;
        delete cleanConfig.password;
      } else {
        delete cleanConfig.tokenId;
        delete cleanConfig.tokenSecret;
      }
      const url = editId ? `/api/admin/providers/${editId}` : "/api/admin/providers";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, name: formName, config: cleanConfig }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      const saved = await res.json();
      if (editId) {
        setProviders((prev) => prev.map((p) => (p.id === editId ? saved : p)));
      } else {
        setProviders((prev) => [saved, ...prev]);
      }
      closeForm();
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
    try {
      const res = await fetch(`/api/admin/providers/${id}/test`, { method: "POST" });
      const data = await res.json();
      const ok = data.success === true;
      const msg = data.message ?? (ok ? "Connexion réussie" : "Connexion échouée");
      setTestStatus((s) => ({ ...s, [id]: ok ? "ok" : "fail" }));
      setTestMsg((m) => ({ ...m, [id]: msg }));
      if (ok) toast.success(msg);
      else toast.error(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      setTestStatus((s) => ({ ...s, [id]: "fail" }));
      setTestMsg((m) => ({ ...m, [id]: msg }));
      toast.error(msg);
    }
  }

  async function toggleActive(p: ProviderConfig) {
    const res = await fetch(`/api/admin/providers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const updated = await res.json();
    setProviders((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    toast.success(updated.isActive ? "Provider activé" : "Provider désactivé");
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plugins & Providers</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {providers.length} provider{providers.length !== 1 ? "s" : ""} configuré{providers.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter un provider
        </Button>
      </div>

      {/* Modal overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeForm}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {editId ? "Modifier le provider" : "Nouveau provider"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {editId ? "Modifiez la configuration ci-dessous" : "Configurez un nouveau provider de provisionnement"}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Type + Nom */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Type de provider
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => { setSelectedProvider(e.target.value as ProviderSlug); setFormConfig({}); }}
                    disabled={!!editId}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    {Object.entries(PROVIDER_META).map(([slug, m]) => (
                      <option key={slug} value={slug}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Nom affiché <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={`Ex: ${meta.label} Principal`}
                  />
                </div>
              </div>

              {/* Auth method toggle */}
              {meta.authMethods && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Méthode d&apos;authentification
                  </label>
                  <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden mb-2">
                    {meta.authMethods.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setAuthMethod(m.value)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          authMethod === m.value
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {authMethod === "token" && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                      Recommandé — les tokens API sont révocables et peuvent avoir des permissions limitées.
                      Créez-en un dans Proxmox : <strong>Datacenter → Permissions → API Tokens</strong>.
                    </p>
                  )}
                  {authMethod === "userpass" && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                      Moins sécurisé que le token API. Le compte doit avoir le rôle <strong>PVEAdmin</strong> ou <strong>Administrator</strong>.
                    </p>
                  )}
                </div>
              )}

              {/* Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                {meta.fields
                  .filter((f) => !f.authGroup || f.authGroup === authMethod)
                  .map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <Input
                        type={field.type === "password" ? "password" : "text"}
                        value={formConfig[field.key] ?? ""}
                        onChange={(e) => setFormConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                      />
                      {field.hint && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{field.hint}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-2xl">
              <Button variant="secondary" size="sm" onClick={closeForm}>
                Annuler
              </Button>
              <Button onClick={handleSave} loading={saving} size="sm">
                {editId ? "Enregistrer les modifications" : "Créer le provider"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <Server className="h-6 w-6 text-gray-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Aucun provider configuré</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Ajoutez un provider pour activer le provisionnement automatique.
          </p>
          <Button onClick={openAdd} size="sm" variant="secondary">
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter un provider
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {providers.map((p) => {
            const ts = testStatus[p.id] ?? "idle";
            const provMeta = PROVIDER_META[p.provider as ProviderSlug];
            const colorClass = PROVIDER_COLORS[p.provider] ?? "bg-gray-500";

            return (
              <Card key={p.id} className={`transition-opacity ${!p.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">

                    {/* Provider icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                      <Server className="h-5 w-5 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</span>
                        <Badge variant="info" className="text-xs">{provMeta?.label ?? p.provider}</Badge>
                        <Badge variant={p.isActive ? "success" : "neutral"} className="text-xs">
                          {p.isActive ? "Actif" : "Désactivé"}
                        </Badge>
                      </div>

                      {/* Test status */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {ts === "idle" && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Wifi className="h-3 w-3" /> Connexion non testée
                          </span>
                        )}
                        {ts === "testing" && (
                          <span className="text-xs text-blue-500 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Test en cours…
                          </span>
                        )}
                        {ts === "ok" && (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {testMsg[p.id]}
                          </span>
                        )}
                        {ts === "fail" && (
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <WifiOff className="h-3 w-3" /> {testMsg[p.id]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleTest(p.id)}
                        disabled={ts === "testing"}
                        title="Tester la connexion"
                        className={`p-2 rounded-lg text-sm transition-colors ${
                          ts === "ok"
                            ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                            : ts === "fail"
                            ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                            : "text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        } disabled:opacity-50`}
                      >
                        {ts === "testing" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : ts === "ok" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : ts === "fail" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <TestTube2 className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => openEdit(p)}
                        title="Modifier"
                        className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => toggleActive(p)}
                        title={p.isActive ? "Désactiver" : "Activer"}
                        className={`p-2 rounded-lg transition-colors ${
                          p.isActive
                            ? "text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        }`}
                      >
                        {p.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => handleDelete(p.id)}
                        title="Supprimer"
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
