"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Server,
  StickyNote,
  Trash2,
  Save,
  Plus,
  X,
  ShieldOff,
  Mail,
  PauseCircle,
  PlayCircle,
  History,
  ClipboardList,
  Shield,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type ServiceStatus = "ACTIVE" | "SUSPENDED" | "PENDING" | "TERMINATED";
type ServiceType = "VPS" | "MINECRAFT";

interface Service {
  id: string;
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  config: Record<string, unknown>;
  createdAt: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  admin: { id: string; firstName: string | null; lastName: string | null; email: string };
}

interface LoginAttempt {
  id: string;
  ip: string;
  success: boolean;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  user: { firstName: string | null; lastName: string | null; email: string } | null;
}

interface Client {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  totpEnabled: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
  services: Service[];
  clientNotes: Note[];
  loginAttempts: LoginAttempt[];
  auditLogs: AuditEntry[];
}

const STATUS_LABEL: Record<ServiceStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  PENDING: "En attente",
  TERMINATED: "Résilié",
};
const STATUS_VARIANT: Record<ServiceStatus, "success" | "warning" | "info" | "danger"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  PENDING: "info",
  TERMINATED: "danger",
};

const ACTION_LABEL: Record<string, string> = {
  CLIENT_CREATED: "Client créé",
  CLIENT_UPDATED: "Client modifié",
  CLIENT_DELETED: "Client supprimé",
  CLIENT_SUSPENDED: "Compte suspendu",
  CLIENT_ACTIVATED: "Compte réactivé",
  CLIENT_2FA_DISABLED_BY_ADMIN: "2FA désactivé par admin",
  CLIENT_PASSWORD_RESET_SENT: "Lien de reset envoyé",
  SERVICE_CREATED: "Service créé",
  SERVICE_UPDATED: "Service modifié",
  SERVICE_DELETED: "Service supprimé",
};

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "" });
  const [saving, setSaving] = useState(false);

  // Notes
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Service status editing
  const [serviceStatusEditing, setServiceStatusEditing] = useState<string | null>(null);
  const [serviceStatusSaving, setServiceStatusSaving] = useState<string | null>(null);

  // Actions
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [disable2faOpen, setDisable2faOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/admin/clients/${id}`);
    const json = await res.json();
    if (json.success) {
      setClient(json.data);
      setEditForm({
        firstName: json.data.firstName ?? "",
        lastName: json.data.lastName ?? "",
        email: json.data.email,
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Client mis à jour");
        setEditing(false);
        fetchClient();
      } else {
        toast.error(json.error?.message ?? "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (endpoint: string, successMsg: string, closeDialog: () => void) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}/${endpoint}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(successMsg);
        closeDialog();
        fetchClient();
      } else {
        toast.error(json.error?.message ?? "Erreur");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Client supprimé");
        router.push("/admin/clients");
      } else {
        toast.error(json.error?.message ?? "Erreur");
        setDeleteOpen(false);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Note ajoutée");
        setNewNote("");
        fetchClient();
      } else {
        toast.error(json.error?.message ?? "Erreur");
      }
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const res = await fetch(`/api/admin/clients/${id}/notes/${noteId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Note supprimée");
      fetchClient();
    } else {
      toast.error(json.error?.message ?? "Erreur");
    }
  };

  const handleServiceStatusChange = async (serviceId: string, newStatus: ServiceStatus) => {
    setServiceStatusSaving(serviceId);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Statut du service mis à jour");
        setServiceStatusEditing(null);
        fetchClient();
      } else {
        toast.error(json.error?.message ?? "Erreur");
      }
    } finally {
      setServiceStatusSaving(null);
    }
  };

  const handleSendReset = async () => {
    const res = await fetch(`/api/admin/clients/${id}/send-reset`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      toast.success("Lien de réinitialisation envoyé");
    } else {
      toast.error(json.error?.message ?? "Erreur");
    }
  };

  const clientName = (c: Client) =>
    c.firstName || c.lastName ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : c.email;


  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-gray-500">Client introuvable</p>
        <Link href="/admin/clients">
          <Button variant="secondary">Retour</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/clients">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {clientName(client)}
              </h2>
              <Badge variant={client.isSuspended ? "warning" : "success"}>
                {client.isSuspended ? "Suspendu" : "Actif"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Client depuis le {new Date(client.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!client.isSuspended ? (
            <Button variant="secondary" size="sm" onClick={() => setSuspendOpen(true)}>
              <PauseCircle className="h-4 w-4" />
              Suspendre le compte
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setActivateOpen(true)}>
              <PlayCircle className="h-4 w-4" />
              Réactiver le compte
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informations personnelles</CardTitle>
            {!editing ? (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} loading={saving}>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!editing ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Prénom</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{client.firstName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Nom</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{client.lastName ?? "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{client.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">ID</dt>
                <dd className="font-mono text-xs text-gray-400">{client.id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Dernière modification</dt>
                <dd className="text-gray-700 dark:text-gray-300">
                  {new Date(client.updatedAt).toLocaleString("fr-FR")}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prénom</label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sécurité du compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 2FA */}
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {client.totpEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Authentification 2FA
                  </span>
                </div>
                <Badge variant={client.totpEnabled ? "success" : "neutral"}>
                  {client.totpEnabled ? "Activé" : "Désactivé"}
                </Badge>
              </div>
              {client.totpEnabled && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDisable2faOpen(true)}
                  >
                    <ShieldOff className="h-4 w-4" />
                    Désactiver le 2FA
                  </Button>
                </div>
              )}
            </div>

            {/* Password reset */}
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Réinitialisation du mot de passe
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Envoie un lien de réinitialisation par email au client.
              </p>
              <Button size="sm" variant="secondary" onClick={handleSendReset}>
                <Mail className="h-4 w-4" />
                Envoyer un lien
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Services ({client.services.length})
            </CardTitle>
            <Link href={`/admin/services/new?clientId=${client.id}`}>
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {client.services.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun service</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {client.services.map((service) => {
                const isEditingStatus = serviceStatusEditing === service.id;
                const isSaving = serviceStatusSaving === service.id;
                return (
                  <li key={service.id} className="py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="neutral">{service.type}</Badge>
                        <Link
                          href={`/admin/services/${service.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 truncate"
                        >
                          {service.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditingStatus ? (
                          <>
                            <Badge variant={STATUS_VARIANT[service.status]}>
                              {STATUS_LABEL[service.status]}
                            </Badge>
                            <button
                              onClick={() => setServiceStatusEditing(service.id)}
                              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                              Changer
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select
                              value={service.status}
                              onChange={(e) =>
                                handleServiceStatusChange(service.id, e.target.value as ServiceStatus)
                              }
                              disabled={isSaving}
                              className="text-xs py-1 h-7"
                            >
                              <option value="ACTIVE">Actif</option>
                              <option value="SUSPENDED">Suspendu</option>
                              <option value="PENDING">En attente</option>
                              <option value="TERMINATED">Résilié</option>
                            </Select>
                            <button
                              onClick={() => setServiceStatusEditing(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Config preview */}
                    {Object.keys(service.config).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(service.config).map(([key, val]) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400"
                          >
                            <span className="font-medium">{key}:</span>
                            <span>{String(val)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Notes internes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes internes ({client.clientNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Ajouter une note interne (non visible par le client)..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleAddNote}
              loading={addingNote}
              disabled={!newNote.trim()}
            >
              <Plus className="h-4 w-4" />
              Ajouter la note
            </Button>
          </div>
          {client.clientNotes.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune note</p>
          ) : (
            <ul className="space-y-3">
              {client.clientNotes.map((note) => {
                const adminName =
                  note.admin.firstName && note.admin.lastName
                    ? `${note.admin.firstName} ${note.admin.lastName}`
                    : note.admin.email;
                return (
                  <li
                    key={note.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">
                      {adminName} · {new Date(note.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Historique des connexions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique des connexions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.loginAttempts.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune connexion enregistrée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-2 text-left font-medium text-gray-500">Date</th>
                    <th className="pb-2 text-left font-medium text-gray-500">IP</th>
                    <th className="pb-2 text-left font-medium text-gray-500">Résultat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {client.loginAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td className="py-2 text-gray-700 dark:text-gray-300 text-xs">
                        {new Date(attempt.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2 font-mono text-xs text-gray-500">{attempt.ip}</td>
                      <td className="py-2">
                        {attempt.success ? (
                          <Badge variant="success">Succès</Badge>
                        ) : (
                          <Badge variant="danger">Échec</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journal des actions admin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Journal des actions
            </CardTitle>
            <Link
              href={`/admin/logs?entityId=${client.id}`}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Voir tout
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {client.auditLogs.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune action enregistrée</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {client.auditLogs.map((log) => {
                const adminName =
                  log.user?.firstName && log.user?.lastName
                    ? `${log.user.firstName} ${log.user.lastName}`
                    : (log.user?.email ?? "Système");
                return (
                  <li key={log.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {ACTION_LABEL[log.action] ?? log.action}
                      </span>
                      <span className="text-gray-500"> par {adminName}</span>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={() => handleAction("suspend", "Compte suspendu", () => setSuspendOpen(false))}
        title="Suspendre le compte ?"
        description={`Le compte de ${clientName(client)} sera suspendu. Il ne pourra plus se connecter et tous ses services actifs seront suspendus.`}
        confirmLabel="Suspendre le compte"
        confirmVariant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={() => handleAction("activate", "Compte réactivé", () => setActivateOpen(false))}
        title="Réactiver le compte ?"
        description={`Le compte de ${clientName(client)} sera réactivé. Ses services suspendus seront également réactivés.`}
        confirmLabel="Réactiver le compte"
        confirmVariant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le client ?"
        description={`Cette action est irréversible. Le compte de ${clientName(client)} et tous ses services seront définitivement supprimés.`}
        confirmLabel="Supprimer définitivement"
        confirmVariant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={disable2faOpen}
        onClose={() => setDisable2faOpen(false)}
        onConfirm={() => handleAction("disable-2fa", "2FA désactivé", () => setDisable2faOpen(false))}
        title="Désactiver le 2FA ?"
        description={`Le 2FA de ${clientName(client)} sera désactivé. Le client sera déconnecté de toutes ses sessions.`}
        confirmLabel="Désactiver le 2FA"
        confirmVariant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
