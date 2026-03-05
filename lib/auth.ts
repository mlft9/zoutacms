import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as speakeasy from "speakeasy";
import {
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from "@/lib/rate-limit";
import { decrypt } from "@/lib/crypto";

// Lazy-initialized dummy hash used to equalize timing when a user is not found
// Prevents timing-based email enumeration attacks
let _dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!_dummyHash) {
    _dummyHash = await hash("__dummy_password_never_matches__", 12);
  }
  return _dummyHash;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.preprocess(
    (val) => (val === "" || val === "undefined" || val === "null" ? undefined : val),
    z.string().optional()
  ),
  loginType: z.enum(["client", "admin"]).default("client"),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (revocable via tokenVersion)
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        totpCode: { label: "Code 2FA", type: "text" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, totpCode, loginType } = parsed.data;

        // Get IP for rate limiting and audit logging
        const ip =
          (req?.headers?.["x-forwarded-for"] as string)?.split(",")[0] ||
          (req?.headers?.["x-real-ip"] as string) ||
          "unknown";

        const user = await prisma.user.findUnique({
          where: { email },
        });

        // Record login attempt (always, success or fail)
        const recordAttempt = async (success: boolean) => {
          await prisma.loginAttempt.create({
            data: {
              userId: user?.id ?? null,
              email,
              ip,
              success,
            },
          });
        };

        if (!user) {
          // Dummy compare to prevent timing-based user enumeration
          await compare(password, await getDummyHash());
          await recordAttempt(false);
          await recordFailedAttempt(ip);
          return null;
        }

        const passwordValid = await compare(password, user.password);
        if (!passwordValid) {
          await recordAttempt(false);
          await recordFailedAttempt(ip);
          return null;
        }

        // Admin portal: only ADMIN accounts allowed
        if (loginType === "admin" && user.role !== "ADMIN") {
          await recordAttempt(false);
          throw new Error("NOT_ADMIN");
        }

        // Suspended accounts cannot log in (applies to all portals)
        if (user.isSuspended) {
          await recordAttempt(false);
          throw new Error("ACCOUNT_SUSPENDED");
        }

        // Client portal: anyone (CLIENT or ADMIN) can connect — portal determines the interface

        // 2FA verification
        if (user.totpEnabled && user.totpSecret) {
          if (!totpCode) {
            throw new Error("2FA_REQUIRED");
          }

          const plainSecret = decrypt(user.totpSecret);

          const verified = speakeasy.totp.verify({
            secret: plainSecret,
            encoding: "base32",
            token: totpCode,
            window: 1,
          });

          if (!verified) {
            await recordAttempt(false);
            await recordFailedAttempt(ip);
            throw new Error("2FA_INVALID");
          }
        }

        await recordAttempt(true);
        await recordSuccessfulAttempt(ip);

        return {
          id: user.id,
          email: user.email,
          name:
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.email,
          role: user.role,
          portal: loginType,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: embed tokenVersion in the JWT
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.role = u.role;
        token.portal = u.portal;
        token.tokenVersion = u.tokenVersion;
      } else {
        // Subsequent requests: verify the token hasn't been revoked + sync name from DB
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true, firstName: true, lastName: true, email: true },
        });
        if (!dbUser || dbUser.tokenVersion !== (token.tokenVersion as number)) {
          // Token revoked — mark it (cannot return null in NextAuth v4, jose rejects it)
          return { ...token, tokenRevoked: true };
        }
        // Keep name and email in sync with DB (reflects profile updates without re-login)
        token.name =
          dbUser.firstName && dbUser.lastName
            ? `${dbUser.firstName} ${dbUser.lastName}`
            : dbUser.email;
        token.email = dbUser.email;
      }
      return token;
    },
    async session({ session, token }) {
      if ((token as { tokenRevoked?: boolean }).tokenRevoked) {
        // Token was revoked (tokenVersion mismatch) — return expired session with no user
        return { expires: new Date(0).toISOString() } as typeof session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.portal = token.portal as "admin" | "client";
      }
      return session;
    },
  },
};
