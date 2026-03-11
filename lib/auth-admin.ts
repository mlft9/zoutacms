import type { NextAuthOptions } from "next-auth";
import { authOptions } from "./auth";

/**
 * Admin portal auth options — uses a separate session cookie so an admin
 * can be logged into both the admin and client portals simultaneously.
 *
 * The authorize logic is identical to the client auth (loginType drives
 * the portal field in the JWT), but this instance stores the JWT in a
 * different cookie and points the signIn page to /admin/login.
 */
const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

export const adminAuthOptions: NextAuthOptions = {
  ...authOptions,
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  cookies: {
    sessionToken: {
      name: isSecure
        ? "__Secure-next-auth.admin-session-token"
        : "next-auth.admin-session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecure,
      },
    },
    callbackUrl: {
      name: isSecure
        ? "__Secure-next-auth.admin-callback-url"
        : "next-auth.admin-callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: isSecure,
      },
    },
    csrfToken: {
      name: isSecure
        ? "__Host-next-auth.admin-csrf-token"
        : "next-auth.admin-csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecure,
      },
    },
  },
};

export { ADMIN_SESSION_COOKIE } from "./auth-constants";
