// Server-only — imports Node.js providers
import type { ServiceProvider, ProviderConfigData } from "./types";
import { ProxmoxProvider } from "./proxmox";

export type { ProviderSlug } from "./registry-meta";
export { PROVIDER_META } from "./registry-meta";
export type { ProviderField } from "./registry-meta";

export function createProvider(slug: string, config: ProviderConfigData): ServiceProvider {
  switch (slug) {
    case "proxmox":
      return new ProxmoxProvider(config);
    default:
      throw new Error(`Provider inconnu : ${slug}`);
  }
}
