import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { provisionService } from "@/lib/provisioning";
import { logAdminAction } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  provisionService(params.id).catch(console.error);
  await logAdminAction(guard.adminId, "service.provision", "Service", params.id);
  return NextResponse.json({ success: true, message: "Provisionnement démarré" });
}
