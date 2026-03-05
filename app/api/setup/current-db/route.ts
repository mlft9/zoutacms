import { NextResponse } from "next/server";
import { isSetupComplete } from "@/lib/setup";
import { apiError, ErrorCodes } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  if (isSetupComplete()) {
    return apiError(ErrorCodes.FORBIDDEN, "Le setup est déjà terminé", 403);
  }

  const url = process.env.DATABASE_URL ?? "";
  let fields: { host: string; port: string; user: string; database: string } | null = null;

  if (url) {
    try {
      const parsed = new URL(url);
      fields = {
        host: parsed.hostname,
        port: parsed.port || "5432",
        user: decodeURIComponent(parsed.username),
        database: parsed.pathname.replace("/", ""),
        // password intentionally omitted — never sent to the client
      };
    } catch {
      // malformed URL
    }
  }

  return NextResponse.json({
    success: true,
    data: { configured: !!url, fields },
  });
}
