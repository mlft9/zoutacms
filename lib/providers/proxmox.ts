import https from "node:https";
import http from "node:http";
import type {
  ServiceProvider,
  ServiceType,
  ProvisionConfig,
  ProvisionResult,
  ServiceHealthStatus,
  ServiceMetrics,
  ProviderConfigData,
} from "./types";

// Proxmox uses self-signed certificates — skip TLS verification
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const REQUEST_TIMEOUT_MS = 30_000;
const TASK_TIMEOUT_MS = 300_000; // 5 min for clone+start

interface ProxmoxTicketResponse {
  data: { ticket: string; CSRFPreventionToken: string };
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
interface ProxmoxTaskResponse {
  data: string; // UPID
}
interface ProxmoxTaskStatus {
  data: { status: "running" | "stopped"; exitstatus?: string };
}
interface ProxmoxVMTemplate {
  vmid: number;
  name?: string;
  template?: number;
}
interface ProxmoxStorageItem {
  storage: string;
  type: string;
  active?: number;
  enabled?: number;
}

function httpRequest(
  method: string,
  rawUrl: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(rawUrl);
    const isHttps = parsed.protocol === "https:";
    const options: https.RequestOptions = {
      method,
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: {
        ...headers,
        ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}),
      },
      agent: isHttps ? httpsAgent : new http.Agent(),
      timeout: REQUEST_TIMEOUT_MS,
    };
    const req = (isHttps ? https : http).request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: data }));
    });
    req.on("timeout", () =>
      req.destroy(new Error(`Timeout: pas de réponse de ${parsed.hostname} après ${REQUEST_TIMEOUT_MS / 1000}s`))
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
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

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.tokenId && this.tokenSecret) {
      return { Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}` };
    }
    if (this.username && this.password) {
      const body = new URLSearchParams({ username: this.username, password: this.password }).toString();
      const res = await httpRequest("POST", `${this.baseUrl}/api2/json/access/ticket`, {
        "Content-Type": "application/x-www-form-urlencoded",
      }, body);
      if (res.status < 200 || res.status >= 300)
        throw new Error(`Proxmox auth failed: ${res.status} ${res.text}`);
      const data: ProxmoxTicketResponse = JSON.parse(res.text);
      return {
        Cookie: `PVEAuthCookie=${data.data.ticket}`,
        CSRFPreventionToken: data.data.CSRFPreventionToken,
      };
    }
    throw new Error("Proxmox: tokenId+tokenSecret ou username+password requis");
  }

  private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    const authHeaders = await this.getAuthHeaders();
    const url = `${this.baseUrl}/api2/json${path}`;
    let bodyStr: string | undefined;
    if (body && (method === "POST" || method === "PUT")) {
      bodyStr = new URLSearchParams(
        Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
      ).toString();
    }
    const res = await httpRequest(method, url, { "Content-Type": "application/x-www-form-urlencoded", ...authHeaders }, bodyStr);
    if (res.status < 200 || res.status >= 300)
      throw new Error(`Proxmox API ${method} ${path} → ${res.status}: ${res.text}`);
    return JSON.parse(res.text) as T;
  }

  private async waitForTask(upid: string): Promise<void> {
    const node = upid.split(":")[1] ?? this.node;
    const encodedUpid = encodeURIComponent(upid);
    const deadline = Date.now() + TASK_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await this.request<ProxmoxTaskStatus>("GET", `/nodes/${node}/tasks/${encodedUpid}/status`);
      if (res.data.status === "stopped") {
        const exit = res.data.exitstatus ?? "";
        // Proxmox may return "OK" or "OK (with warnings)" — both are success
        if (exit && !exit.startsWith("OK")) throw new Error(`Tâche Proxmox échouée : ${exit}`);
        return;
      }
    }
    throw new Error("Timeout : la tâche Proxmox n'a pas terminé dans les 5 minutes");
  }

  private async getNextVmId(): Promise<number> {
    const res = await this.request<ProxmoxNextIdResponse>("GET", "/cluster/nextid");
    return res.data;
  }

  // ─── Cloud-init VM creation (clone template) ───────────────────────────────

  async create(config: ProvisionConfig): Promise<ProvisionResult> {
    if (!config.templateVmid) {
      throw new Error("templateVmid requis : choisissez un template cloud-init dans Proxmox");
    }

    const vmid = config.vmid ?? (await this.getNextVmId());
    const ram = config.ram ?? 1024;
    const cpu = config.cpu ?? 1;
    const storagePool = config.storagePool ?? "local-lvm";
    const bridge = config.bridge ?? "vmbr0";
    const ipConfig = config.ipConfig ?? "dhcp";
    const vmName = config.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");

    // 1. Clone the template (full clone to selected storage)
    const cloneRes = await this.request<ProxmoxTaskResponse>(
      "POST",
      `/nodes/${this.node}/qemu/${config.templateVmid}/clone`,
      { newid: vmid, name: vmName, storage: storagePool, full: 1 }
    );
    await this.waitForTask(cloneRes.data);

    // 2. Configure resources + cloud-init
    const vmConfig: Record<string, unknown> = {
      memory: ram,
      cores: cpu,
      sockets: 1,
      net0: `virtio,bridge=${bridge}`,
      ipconfig0: ipConfig === "dhcp" ? "ip=dhcp" : `ip=${ipConfig}`,
    };
    if (config.ciuser) vmConfig.ciuser = config.ciuser;
    if (config.cipassword) vmConfig.cipassword = config.cipassword;
    if (config.sshkeys) vmConfig.sshkeys = encodeURIComponent(String(config.sshkeys));
    await this.request("PUT", `/nodes/${this.node}/qemu/${vmid}/config`, vmConfig);

    // 3. Resize disk only if new size is larger than current (no shrink)
    let actualStorageGb: number | undefined;
    try {
      const vmCfg = await this.request<{ data: Record<string, string> }>(
        "GET", `/nodes/${this.node}/qemu/${vmid}/config`
      );
      // Proxmox templates may use any disk bus type
      const diskKeys = ["scsi0", "virtio0", "sata0", "ide0", "scsi1", "virtio1"];
      const diskStr = diskKeys.map((k) => vmCfg.data[k]).find(Boolean) ?? "";
      const match = diskStr.match(/size=(\d+)([KMGT])/i);
      const parseDiskGb = (m: RegExpMatchArray): number => {
        const n = parseInt(m[1]);
        switch (m[2].toUpperCase()) {
          case "T": return n * 1024;
          case "M": return Math.ceil(n / 1024);
          case "K": return Math.ceil(n / (1024 * 1024));
          default:  return n; // G
        }
      };
      const currentGb = match ? parseDiskGb(match) : 0;

      if (currentGb > 0) {
        if (config.storage && config.storage > currentGb) {
          // Determine which disk key to resize
          const diskKey = diskKeys.find((k) => vmCfg.data[k]) ?? "scsi0";
          await this.request("PUT", `/nodes/${this.node}/qemu/${vmid}/resize`, {
            disk: diskKey,
            size: `${config.storage}G`,
          });
          actualStorageGb = config.storage;
        } else {
          actualStorageGb = currentGb; // real size from template
        }
      } else if (config.storage) {
        // Disk key not found or size unparseable — attempt resize anyway
        try {
          await this.request("PUT", `/nodes/${this.node}/qemu/${vmid}/resize`, {
            disk: "scsi0",
            size: `${config.storage}G`,
          });
          actualStorageGb = config.storage;
        } catch { /* ignore — disk size stays unknown */ }
      }
    } catch {
      actualStorageGb = config.storage;
    }

    // 4. Start the VM
    const startRes = await this.request<ProxmoxTaskResponse>(
      "POST",
      `/nodes/${this.node}/qemu/${vmid}/status/start`,
      {}
    );
    await this.waitForTask(startRes.data);

    const status = await this.request<ProxmoxVMStatus>(
      "GET",
      `/nodes/${this.node}/qemu/${vmid}/status/current`
    );

    return {
      externalId: String(vmid),
      additionalConfig: {
        vmid,
        node: this.node,
        ram,
        cpu,
        storage: actualStorageGb,
        proxmoxStatus: status.data.status,
      },
    };
  }

  /** Get noVNC credentials for embedding a console in our panel */
  async getVncCredentials(externalId: string): Promise<{ wsUrl: string; password: string }> {
    const res = await this.request<{ data: { ticket: string; port: string } }>(
      "POST",
      `${this.vmBase(externalId)}/vncproxy`,
      { websocket: 1 }
    );
    const { ticket, port } = res.data;
    const baseWs = this.baseUrl.replace(/^http/, "ws");
    const wsUrl = `${baseWs}/api2/json/nodes/${this.node}/qemu/${externalId}/vncwebsocket?port=${port}&vncticket=${encodeURIComponent(ticket)}`;
    return { wsUrl, password: ticket };
  }

  // ─── VM lifecycle ──────────────────────────────────────────────────────────

  private vmBase(externalId: string): string {
    return `/nodes/${this.node}/qemu/${externalId}`;
  }

  async start(externalId: string): Promise<void> {
    const res = await this.request<ProxmoxTaskResponse>("POST", `${this.vmBase(externalId)}/status/start`, {});
    await this.waitForTask(res.data);
  }

  async stop(externalId: string): Promise<void> {
    const res = await this.request<ProxmoxTaskResponse>("POST", `${this.vmBase(externalId)}/status/stop`, {});
    await this.waitForTask(res.data);
  }

  async restart(externalId: string): Promise<void> {
    const res = await this.request<ProxmoxTaskResponse>("POST", `${this.vmBase(externalId)}/status/reboot`, {});
    await this.waitForTask(res.data);
  }

  async suspend(externalId: string): Promise<void> {
    await this.request("POST", `${this.vmBase(externalId)}/status/suspend`, {});
  }

  async unsuspend(externalId: string): Promise<void> {
    const res = await this.request<ProxmoxTaskResponse>("POST", `${this.vmBase(externalId)}/status/start`, {});
    await this.waitForTask(res.data);
  }

  async terminate(externalId: string): Promise<void> {
    try {
      const res = await this.request<ProxmoxTaskResponse>("POST", `${this.vmBase(externalId)}/status/stop`, {});
      await this.waitForTask(res.data);
    } catch { /* already stopped */ }
    const res = await this.request<ProxmoxTaskResponse>("DELETE", this.vmBase(externalId));
    if (typeof res === "object" && res !== null && "data" in res && typeof (res as ProxmoxTaskResponse).data === "string") {
      await this.waitForTask((res as ProxmoxTaskResponse).data);
    }
  }

  async getStatus(externalId: string): Promise<ServiceHealthStatus> {
    try {
      const res = await this.request<ProxmoxVMStatus>("GET", `${this.vmBase(externalId)}/status/current`);
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
    // Use Proxmox built-in noVNC (novnc=1 opens just the console, no management UI)
    const res = await this.request<{ data: { ticket: string; port: string } }>(
      "POST",
      `${this.vmBase(externalId)}/vncproxy`,
      { websocket: 0 }
    );
    const ticket = encodeURIComponent(res.data.ticket);
    return `${this.baseUrl}/?console=kvm&novnc=1&vmid=${externalId}&node=${this.node}&ticket=${ticket}&resize=scale`;
  }

  async getMetrics(externalId: string): Promise<ServiceMetrics> {
    const res = await this.request<ProxmoxVMStatus>("GET", `${this.vmBase(externalId)}/status/current`);
    const d = res.data;
    return {
      cpu: d.cpu !== undefined ? Math.round(d.cpu * 100) : undefined,
      ram: d.mem && d.maxmem ? Math.round((d.mem / d.maxmem) * 100) : undefined,
      disk: d.disk && d.maxdisk ? Math.round((d.disk / d.maxdisk) * 100) : undefined,
      network: d.netin !== undefined ? { in: d.netin, out: d.netout ?? 0 } : undefined,
    };
  }

  // ─── Resource listing ──────────────────────────────────────────────────────

  /** List QEMU VM templates (VMs with template flag set) */
  async listVmTemplates(): Promise<{ vmid: number; name: string }[]> {
    const res = await this.request<{ data: ProxmoxVMTemplate[] }>("GET", `/nodes/${this.node}/qemu`);
    return res.data
      .filter((vm) => vm.template === 1)
      .map((vm) => ({ vmid: vm.vmid, name: vm.name ?? `VM ${vm.vmid}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** List storage pools on the node */
  async listStorage(): Promise<{ id: string; type: string }[]> {
    const res = await this.request<{ data: ProxmoxStorageItem[] }>("GET", `/nodes/${this.node}/storage`);
    return res.data
      .filter((s) => (s.active ?? 1) === 1 && (s.enabled ?? 1) === 1)
      .map((s) => ({ id: s.storage, type: s.type }));
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request("GET", `/nodes/${this.node}/status`);
      return { success: true, message: `Connexion réussie au nœud "${this.node}"` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Erreur inconnue" };
    }
  }
}
