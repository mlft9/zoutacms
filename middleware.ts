import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role;
    const portal = token?.portal;

    // Admin routes — require ADMIN role AND admin portal
    // (an admin who logged in via /login has portal="client" and cannot access /admin/*)
    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN" || portal !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/((?!login).*)", // /admin/* sauf /admin/login
    "/profile/:path*",
    "/services/:path*",
  ],
};
