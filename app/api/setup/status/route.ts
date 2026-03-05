import { NextRequest, NextResponse } from "next/server";
import { isSetupComplete, getSetupProgress } from "@/lib/setup";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const complete = isSetupComplete();
  const progress = getSetupProgress();

  const response = NextResponse.json({
    success: true,
    data: { needed: !complete, currentStep: progress.step },
  });

  // If setup is already done but the cookie is missing (e.g. cleared by user),
  // restore it to prevent an infinite redirect loop in the middleware.
  if (complete && req.cookies.get("setup-complete")?.value !== "true") {
    response.cookies.set("setup-complete", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 10,
    });
  }

  return response;
}
