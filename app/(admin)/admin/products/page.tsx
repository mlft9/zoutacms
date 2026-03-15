"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package, Plus, Pencil, Power, PowerOff, Trash2, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  plans: { id: string }[];
}

type ModalMode = "add" | "edit" | null;

export default function ProductGroupsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditId(null);
    setGroupName("");
    setGroupDesc("");
    setModalMode("add");
  }

  function openEdit(e: React.MouseEvent, p: Product) {
    e.stopPropagation();
    setEditId(p.id);
    setGroupName(p.name);
    setGroupDesc(p.description ?? "");
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
  }

  async function handleSave() {
    if (!groupName.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/products/${editId}` : "/api/admin/products";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), description: groupDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Erreur");
      if (editId) {
        setProducts((prev) => prev.map((p) => (p.id === editId ? { ...p, ...data.data } : p)));
        toast.success("Groupe mis à jour");
      } else {
        setProducts((prev) => [data.data, ...prev]);
        toast.success("Groupe créé");
      }
      closeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(e: React.MouseEvent, p: Product) {
    e.stopPropagation();
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const data = await res.json();
    if (data.success) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: data.data.isActive } : x)));
      toast.success(data.data.isActive ? "Groupe activé" : "Groupe désactivé");
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Supprimer ce groupe de produits ?")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      if (data.data.deleted) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success("Groupe supprimé");
      } else {
        toast.info("Groupe désactivé (des produits existent)");
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: false } : p)));
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Groupes de produits</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {products.length} groupe{products.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau groupe
        </Button>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {modalMode === "add" ? "Nouveau groupe" : "Modifier le groupe"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Nom <span className="text-red-500">*</span>
                </label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: VPS Ryzen"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <Input
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Description optionnelle"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" size="sm" onClick={closeModal}>Annuler</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {modalMode === "add" ? "Créer" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Aucun groupe de produits</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Créez votre premier groupe (ex: VPS Ryzen, Minecraft...).
          </p>
          <Button onClick={openAdd} size="sm" variant="secondary">
            <Plus className="h-4 w-4 mr-1.5" />
            Nouveau groupe
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 shadow-sm ${!p.isActive ? "opacity-60" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</span>
                      <Badge variant={p.isActive ? "success" : "neutral"} className="text-xs">
                        {p.isActive ? "Actif" : "Désactivé"}
                      </Badge>
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.plans.length} produit{p.plans.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => openEdit(e, p)}
                      title="Modifier"
                      className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleToggle(e, p)}
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
                      onClick={(e) => handleDelete(e, p.id)}
                      title="Supprimer"
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
