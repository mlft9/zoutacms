import { NextResponse } from "next/server";
import { isSetupDone, markSetupComplete } from "@/lib/setup";
import { apiError, ErrorCodes } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  if (await isSetupDone()) {
    return apiError(ErrorCodes.FORBIDDEN, "Le setup est déjà terminé", 403);
  }

  markSetupComplete();

  // Persist setup completion in DB — second line of defense if .setup-complete is deleted
  await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: { isSetupComplete: true },
    create: { id: "singleton", isSetupComplete: true },
  });

  // Set the setup-complete cookie (httpOnly, persistent)
  const response = NextResponse.json({ success: true, data: { done: true } });
  response.cookies.set("setup-complete", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  });

  return response;
}
