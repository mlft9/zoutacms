export type ServiceType = "VPS" | "MINECRAFT";

export interface ProvisionConfig {
  name: string;
  type: ServiceType;
  // Resources
  ram?: number;           // MB
  cpu?: number;           // cores
  storage?: number;       // GB (disk resize after clone)
  // Proxmox cloud-init
  templateVmid?: number;  // VMID of the cloud-init template to clone
  vmid?: number;          // target VMID (auto if not set)
  storagePool?: string;   // storage for cloned disk (e.g. local-lvm, SSD-2To)
  bridge?: string;        // network bridge, default vmbr0
  ipConfig?: string;      // "dhcp" or "ip=x.x.x.x/24,gw=x.x.x.x"
  ciuser?: string;        // cloud-init username
  cipassword?: string;    // cloud-init password
  sshkeys?: string;       // cloud-init SSH public key(s)
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
  cpu?: number;
  ram?: number;
  disk?: number;
  network?: { in: number; out: number };
}

export interface ServiceProvider {
  readonly name: string;
  readonly type: ServiceType;
  create(config: ProvisionConfig): Promise<ProvisionResult>;
  start(externalId: string): Promise<void>;
  stop(externalId: string): Promise<void>;
  restart(externalId: string): Promise<void>;
  suspend(externalId: string): Promise<void>;
  unsuspend(externalId: string): Promise<void>;
  terminate(externalId: string): Promise<void>;
  getStatus(externalId: string): Promise<ServiceHealthStatus>;
  getConsoleUrl(externalId: string): Promise<string>;
  getMetrics?(externalId: string): Promise<ServiceMetrics>;
  testConnection(): Promise<{ success: boolean; message: string }>;
}

export interface ProviderConfigData {
  url?: string;
  username?: string;
  password?: string;
  tokenId?: string;
  tokenSecret?: string;
  node?: string;
  apiToken?: string;
  [key: string]: unknown;
}
