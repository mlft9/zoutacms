/**
 * Auth cookie names — importable in Edge runtime (middleware).
 * No Node.js dependencies.
 */
const isProd = process.env.NODE_ENV === "production";

export const CLIENT_SESSION_COOKIE = isProd
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

export const ADMIN_SESSION_COOKIE = isProd
  ? "__Secure-next-auth.admin-session-token"
  : "next-auth.admin-session-token";
