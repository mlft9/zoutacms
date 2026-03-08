import type {
  ServiceProvider,
  ServiceType,
  ProvisionConfig,
  ProvisionResult,
  ServiceHealthStatus,
  ServiceMetrics,
  ProviderConfigData,
} from "./types";

interface ProxmoxAuthHeaders {
  Authorization?: string;
  CSRFPreventionToken?: string;
  Cookie?: string;
}

interface ProxmoxTicketResponse {
  data: {
    ticket: string;
    CSRFPreventionToken: string;
  };
}

interface ProxmoxVMStatus {
  data: {
    status: string;
    cpu?: number;
    mem?: number;
    maxmem?: number;
    disk?: number;
    maxdisk?: number;
    netin?: number;
    netout?: number;
  };
}

interface ProxmoxNextIdResponse {
  data: number;
}

interface ProxmoxConsoleResponse {
  data: {
    ticket: string;
    port: string;
    upid: string;
    cert: string;
    user: string;
  };
}

export class ProxmoxProvider implements ServiceProvider {
  readonly name = "Proxmox VE";
  readonly type: ServiceType = "VPS";

  private baseUrl: string;
  private node: string;
  private tokenId?: string;
  private tokenSecret?: string;
  private username?: string;
  private password?: string;

  constructor(config: ProviderConfigData) {
    if (!config.url) throw new Error("Proxmox: URL requise");
    if (!config.node) throw new Error("Proxmox: nœud requis");

    this.baseUrl = String(config.url).replace(/\/$/, "");
    this.node = String(config.node);
    this.tokenId = config.tokenId ? String(config.tokenId) : undefined;
    this.tokenSecret = config.tokenSecret ? String(config.tokenSecret) : undefined;
    this.username = config.username ? String(config.username) : undefined;
    this.password = config.password ? String(config.password) : undefined;
  }

  private async getAuthHeaders(): Promise<ProxmoxAuthHeaders> {
    if (this.tokenId && this.tokenSecret) {
      return { Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}` };
    }

    if (this.username && this.password) {
      const res = await fetch(`${this.baseUrl}/api2/json/access/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: this.username, password: this.password }),
      });
      if (!res.ok) throw new Error(`Proxmox auth failed: ${res.status}`);
      const data: ProxmoxTicketResponse = await res.json();
      return {
        Cookie: `PVEAuthCookie=${data.data.ticket}`,
        CSRFPreventionToken: data.data.CSRFPreventionToken,
      };
    }

    throw new Error("Proxmox: tokenId+tokenSecret ou username+password requis");
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseUrl}/api2/json${path}`;

    const fetchOpts: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...headers,
      },
    };

    if (body && (method === "POST" || method === "PUT")) {
      fetchOpts.body = new URLSearchParams(
        Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
      );
    }

    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Proxmox API ${method} ${path} → ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  private async getNextVmId(): Promise<number> {
    const res = await this.request<ProxmoxNextIdResponse>("GET", "/cluster/nextid");
    return res.data;
  }

  async create(config: ProvisionConfig): Promise<ProvisionResult> {
    const vmid = await this.getNextVmId();
    const ram = config.ram ?? 1024;
    const cpu = config.cpu ?? 1;
    const storage = config.storage ?? 20;
    const os = config.os ?? "local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst";
    const storagePool = (config.storagePool as string) ?? "local-lvm";

    // Create LXC container
    await this.request("POST", `/nodes/${this.node}/lxc`, {
      vmid,
      hostname: config.name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase(),
      memory: ram,
      cores: cpu,
      rootfs: `${storagePool}:${storage}`,
      ostemplate: os,
      net0: "name=eth0,bridge=vmbr0,ip=dhcp",
      start: 1,
      unprivileged: 1,
    });

    // Wait briefly for IP assignment
    await new Promise((r) => setTimeout(r, 3000));

    const status = await this.request<ProxmoxVMStatus>(
      "GET",
      `/nodes/${this.node}/lxc/${vmid}/status/current`
    );

    return {
      externalId: String(vmid),
      additionalConfig: {
        vmid,
        node: this.node,
        ram,
        cpu,
        storage,
        proxmoxStatus: status.data.status,
      },
    };
  }

  async start(externalId: string): Promise<void> {
    await this.request("POST", `/nodes/${this.node}/lxc/${externalId}/status/start`, {});
  }

  async stop(externalId: string): Promise<void> {
    await this.request("POST", `/nodes/${this.node}/lxc/${externalId}/status/stop`, {});
  }

  async restart(externalId: string): Promise<void> {
    await this.request("POST", `/nodes/${this.node}/lxc/${externalId}/status/reboot`, {});
  }

  async suspend(externalId: string): Promise<void> {
    await this.request("POST", `/nodes/${this.node}/lxc/${externalId}/status/suspend`, {});
  }

  async unsuspend(externalId: string): Promise<void> {
    await this.request("POST", `/nodes/${this.node}/lxc/${externalId}/status/resume`, {});
  }

  async terminate(externalId: string): Promise<void> {
    // Stop first, then destroy
    try {
      await this.stop(externalId);
      await new Promise((r) => setTimeout(r, 2000));
    } catch {
      // Already stopped
    }
    await this.request("DELETE", `/nodes/${this.node}/lxc/${externalId}`);
  }

  async getStatus(externalId: string): Promise<ServiceHealthStatus> {
    try {
      const res = await this.request<ProxmoxVMStatus>(
        "GET",
        `/nodes/${this.node}/lxc/${externalId}/status/current`
      );
      const s = res.data.status;
      if (s === "running") return "running";
      if (s === "stopped") return "stopped";
      if (s === "suspended") return "suspended";
      return "unknown";
    } catch {
      return "error";
    }
  }

  async getConsoleUrl(externalId: string): Promise<string> {
    const res = await this.request<ProxmoxConsoleResponse>(
      "POST",
      `/nodes/${this.node}/lxc/${externalId}/termproxy`,
      {}
    );
    // Return a URL to the built-in Proxmox console (xterm.js proxy)
    const ticket = encodeURIComponent(res.data.ticket);
    return `${this.baseUrl}/?console=lxc&vmid=${externalId}&node=${this.node}&ticket=${ticket}`;
  }

  async getMetrics(externalId: string): Promise<ServiceMetrics> {
    const res = await this.request<ProxmoxVMStatus>(
      "GET",
      `/nodes/${this.node}/lxc/${externalId}/status/current`
    );
    const d = res.data;
    return {
      cpu: d.cpu ? Math.round(d.cpu * 100) : undefined,
      ram: d.mem && d.maxmem ? Math.round((d.mem / d.maxmem) * 100) : undefined,
      disk: d.disk && d.maxdisk ? Math.round((d.disk / d.maxdisk) * 100) : undefined,
      network: d.netin !== undefined ? { in: d.netin, out: d.netout ?? 0 } : undefined,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request("GET", `/nodes/${this.node}/status`);
      return true;
    } catch {
      return false;
    }
  }
}
