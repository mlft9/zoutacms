// Client-safe metadata — no Node.js imports

export type ProviderSlug = "proxmox";

export interface ProviderField {
  key: string;
  label: string;
  type: "text" | "password" | "number";
  placeholder?: string;
  hint?: string;
  required: boolean;
  authGroup?: "token" | "userpass";
}

export const PROVIDER_META: Record<ProviderSlug, {
  label: string;
  description: string;
  fields: ProviderField[];
  authMethods?: { value: string; label: string }[];
}> = {
  proxmox: {
    label: "Proxmox VE",
    description: "Hyperviseur open-source pour VMs et conteneurs LXC",
    authMethods: [
      { value: "token",    label: "Token API (recommandé)" },
      { value: "userpass", label: "Utilisateur / Mot de passe" },
    ],
    fields: [
      { key: "url",         label: "URL API",       type: "text",     placeholder: "https://proxmox.example.com:8006", hint: "URL complète avec port (par défaut 8006). Doit être accessible depuis ce serveur.", required: true },
      { key: "node",        label: "Nœud",          type: "text",     placeholder: "pve", hint: "Nom du nœud Proxmox tel qu'affiché dans l'interface (Datacenter > nom du nœud).", required: true },
      { key: "tokenId",     label: "Token ID",      type: "text",     placeholder: "user@pam!mytoken", hint: "Format : utilisateur@realm!nom-du-token. Créer via Datacenter > Permissions > API Tokens.", required: true, authGroup: "token" },
      { key: "tokenSecret", label: "Token Secret",  type: "password", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", hint: "UUID affiché une seule fois à la création du token. Assurez-vous que le token a le rôle PVEAdmin ou Administrator.", required: true, authGroup: "token" },
      { key: "username",    label: "Utilisateur",   type: "text",     placeholder: "root@pam", hint: "Format : utilisateur@realm (ex: root@pam, admin@pve). Le realm est visible dans Datacenter > Permissions > Realms.", required: true, authGroup: "userpass" },
      { key: "password",    label: "Mot de passe",  type: "password", placeholder: "", hint: "Mot de passe du compte Proxmox. Préférez l'authentification par token API pour plus de sécurité.", required: true, authGroup: "userpass" },
    ],
  },
};
