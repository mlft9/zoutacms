"use client";

import { useState, useEffect } from "react";
import { Database, CheckCircle2, XCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StepDatabaseProps {
  onNext: () => void;
}

interface DbFields {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

type TestStatus = "idle" | "testing" | "success" | "error";

function buildUrl(fields: DbFields): string {
  const { host, port, user, password, database } = fields;
  if (!host || !user || !database) return "";
  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPass}@${host}:${port || "5432"}/${database}`;
}

function parseUrl(url: string): DbFields | null {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("postgresql") && !parsed.protocol.startsWith("postgres")) {
      return null;
    }
    return {
      host: parsed.hostname,
      port: parsed.port || "5432",
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace("/", ""),
    };
  } catch {
    return null;
  }
}

export function StepDatabase({ onNext }: StepDatabaseProps) {
  const [fields, setFields] = useState<DbFields>({
    host: "",
    port: "5432",
    user: "",
    password: "",
    database: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [requiresRestart, setRequiresRestart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    fetch("/api/setup/current-db")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.url) {
          const parsed = parseUrl(json.data.url);
          if (parsed) {
            setFields(parsed);
            handleTestUrl(buildUrl(parsed));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(key: keyof DbFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setTestStatus("idle");
  }

  async function handleTestUrl(url: string) {
    if (!url) return;
    setTestStatus("testing");
    setTestMessage("");

    const res = await fetch("/api/setup/test-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();

    if (json.success) {
      setTestStatus("success");
      setTestMessage("Connexion réussie !");
    } else {
      setTestStatus("error");
      setTestMessage(json.error?.message ?? "Connexion impossible");
    }
  }

  async function handleTest() {
    await handleTestUrl(buildUrl(fields));
  }

  async function handleSave() {
    const url = buildUrl(fields);
    if (!url) return;

    setSaving(true);
    const res = await fetch("/api/setup/save-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();
    setSaving(false);

    if (json.success) {
      if (json.data.requiresRestart) {
        setRequiresRestart(true);
        startPolling();
      } else {
        onNext();
      }
    }
  }

  function startPolling() {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/setup/status");
        const json = await res.json();
        if (json.success && json.data.needed) {
          clearInterval(interval);
          setPolling(false);
          onNext();
        }
      } catch {
        // Server still restarting
      }
    }, 2000);
  }

  const canSave = testStatus === "success";
  const canTest = !!(fields.host && fields.user && fields.database) && !loading;

  if (requiresRestart) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Redémarrez le serveur
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          La nouvelle URL a été enregistrée dans{" "}
          <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
            .env.local
          </code>
          . Redémarrez le serveur Next.js pour que le changement prenne effet.
        </p>
        {polling && (
          <p className="text-xs text-gray-500">En attente du redémarrage...</p>
        )}
        <Button variant="secondary" onClick={startPolling} disabled={polling}>
          {polling ? "Détection en cours..." : "Détecter le redémarrage"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input
            label="Hôte"
            placeholder="localhost ou 10.0.0.145"
            value={fields.host}
            onChange={(e) => setField("host", e.target.value)}
            disabled={loading}
          />
        </div>
        <Input
          label="Port"
          placeholder="5432"
          value={fields.port}
          onChange={(e) => setField("port", e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Utilisateur"
          placeholder="postgres"
          value={fields.user}
          onChange={(e) => setField("user", e.target.value)}
          disabled={loading}
          autoComplete="off"
        />
        <div className="relative">
          <Input
            label="Mot de passe"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={fields.password}
            onChange={(e) => setField("password", e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-[30px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Input
        label="Nom de la base de données"
        placeholder="zoutacms"
        value={fields.database}
        onChange={(e) => setField("database", e.target.value)}
        disabled={loading}
      />

      {testStatus !== "idle" && (
        <div
          className={`flex items-center gap-2 text-sm rounded-lg p-3 ${
            testStatus === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : testStatus === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
          }`}
        >
          {testStatus === "success" && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
          {testStatus === "error" && <XCircle className="h-4 w-4 flex-shrink-0" />}
          {testStatus === "testing" && <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" />}
          <span>{testStatus === "testing" ? "Test en cours..." : testMessage}</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={handleTest}
          loading={testStatus === "testing"}
          disabled={!canTest}
          className="flex-1"
        >
          <Database className="h-4 w-4" />
          Tester
        </Button>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!canSave}
          className="flex-1"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
