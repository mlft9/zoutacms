/**
 * Auth cookie names — importable in Edge runtime (middleware).
 * No Node.js dependencies.
 *
 * Use HTTPS detection (via NEXTAUTH_URL) rather than NODE_ENV so that
 * a production Docker container served over plain HTTP still works.
 * The __Secure- / __Host- prefixes require HTTPS — browsers silently
 * drop those cookies on HTTP, breaking the login flow.
 */
const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

export const CLIENT_SESSION_COOKIE = isSecure
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

export const ADMIN_SESSION_COOKIE = isSecure
  ? "__Secure-next-auth.admin-session-token"
  : "next-auth.admin-session-token";
