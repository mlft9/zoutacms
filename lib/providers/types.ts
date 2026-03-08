export type ServiceType = "VPS" | "MINECRAFT";

export interface ProvisionConfig {
  name: string;
  type: ServiceType;
  // Common resource params
  ram?: number;     // MB
  cpu?: number;     // cores
  storage?: number; // GB
  os?: string;
  // Provider-specific params (free-form)
  [key: string]: unknown;
}

export interface ProvisionResult {
  externalId: string;
  ip?: string;
  port?: number;
  additionalConfig?: Record<string, unknown>;
}

export type ServiceHealthStatus = "running" | "stopped" | "suspended" | "unknown" | "error";

export interface ServiceMetrics {
  cpu?: number;    // percentage
  ram?: number;    // percentage
  disk?: number;   // percentage
  network?: { in: number; out: number }; // bytes/s
}

export interface ServiceProvider {
  readonly name: string;
  readonly type: ServiceType;

  // Lifecycle
  create(config: ProvisionConfig): Promise<ProvisionResult>;
  start(externalId: string): Promise<void>;
  stop(externalId: string): Promise<void>;
  restart(externalId: string): Promise<void>;
  suspend(externalId: string): Promise<void>;
  unsuspend(externalId: string): Promise<void>;
  terminate(externalId: string): Promise<void>;

  // Status & info
  getStatus(externalId: string): Promise<ServiceHealthStatus>;
  getConsoleUrl(externalId: string): Promise<string>;

  // Metrics (optional)
  getMetrics?(externalId: string): Promise<ServiceMetrics>;

  // Connectivity test
  testConnection(): Promise<boolean>;
}

export interface ProviderConfigData {
  // Proxmox
  url?: string;
  username?: string;
  password?: string;
  tokenId?: string;
  tokenSecret?: string;
  node?: string;
  // Hetzner
  apiToken?: string;
  // Common
  [key: string]: unknown;
}
