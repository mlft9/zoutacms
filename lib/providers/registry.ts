import type { ServiceProvider, ProviderConfigData } from "./types";
import { ProxmoxProvider } from "./proxmox";

export type ProviderSlug = "proxmox";

export function createProvider(slug: ProviderSlug, config: ProviderConfigData): ServiceProvider {
  switch (slug) {
    case "proxmox":
      return new ProxmoxProvider(config);
    default:
      throw new Error(`Provider inconnu : ${slug}`);
  }
}

export const PROVIDER_META: Record<ProviderSlug, { label: string; description: string; fields: ProviderField[] }> = {
  proxmox: {
    label: "Proxmox VE",
    description: "Hyperviseur open-source pour VMs et conteneurs LXC",
    fields: [
      { key: "url",         label: "URL API",         type: "text",     placeholder: "https://proxmox.example.com:8006", required: true },
      { key: "node",        label: "Nœud",            type: "text",     placeholder: "pve",  required: true },
      { key: "tokenId",     label: "Token ID",        type: "text",     placeholder: "user@pam!mytoken", required: false },
      { key: "tokenSecret", label: "Token Secret",    type: "password", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: false },
      { key: "username",    label: "Utilisateur",     type: "text",     placeholder: "root@pam (si pas de token)", required: false },
      { key: "password",    label: "Mot de passe",    type: "password", placeholder: "", required: false },
    ],
  },
};

export interface ProviderField {
  key: string;
  label: string;
  type: "text" | "password" | "number";
  placeholder?: string;
  required: boolean;
}
