import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth-constants";

const SETUP_COOKIE = "setup-complete";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Always allow setup routes to pass through
  if (pathname.startsWith("/setup") || pathname.startsWith("/api/setup")) {
    return NextResponse.next();
  }

  // CSRF protection: for non-GET API mutations, verify the Origin header matches the host
  // Exemption: /api/auth and /api/admin-auth are handled by NextAuth (own CSRF)
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/admin-auth") &&
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS"
  ) {
    const origin = req.headers.get("origin");
    if (origin) {
      const host = req.headers.get("host");
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return new NextResponse("Forbidden", { status: 403 });
        }
      } catch {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
  }

  // Check setup status via cookie (Edge-compatible)
  const setupComplete = req.cookies.get(SETUP_COOKIE)?.value === "true";

  if (!setupComplete) {
    // Redirect everything to setup wizard
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  // --- Setup is done, apply normal auth rules ---

  // Public auth pages — no token needed
  const publicPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/admin/login",
    "/api/auth",
    "/api/admin-auth",
  ];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Protected routes — require a valid JWT token
  const protectedPaths = ["/dashboard", "/admin", "/profile", "/services"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const isAdminRoute = pathname.startsWith("/admin");

    // Admin routes: read from the admin session cookie
    // Client routes: read from the default (client) session cookie
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      ...(isAdminRoute ? { cookieName: ADMIN_SESSION_COOKIE } : {}),
    });

    if (!token || (token as { tokenRevoked?: boolean }).tokenRevoked) {
      const loginUrl = isAdminRoute ? "/admin/login" : "/login";
      return NextResponse.redirect(new URL(loginUrl, req.url));
    }

    // Admin routes require ADMIN role AND admin portal login
    if (isAdminRoute) {
      if (token.role !== "ADMIN" || token.portal !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
