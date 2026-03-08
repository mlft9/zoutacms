import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { performServiceAction } from "@/lib/provisioning";
import { logAdminAction } from "@/lib/audit";

const schema = z.object({
  action: z.enum(["start", "stop", "restart", "suspend", "unsuspend", "terminate"]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await performServiceAction(params.id, parsed.data.action);
    await logAdminAction(guard.adminId, `service.${parsed.data.action}`, "Service", params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lors de l'action" },
      { status: 500 }
    );
  }
}
