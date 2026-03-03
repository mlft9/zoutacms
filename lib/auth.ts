import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as speakeasy from "speakeasy";
import {
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
  loginType: z.enum(["client", "admin"]).default("client"),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
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

        // Rate limiting: max 5 login attempts per minute per IP
        const rl = checkRateLimit(ip, 5, 10, 15 * 60 * 1000);
        if (!rl.success) {
          throw new Error("RATE_LIMITED");
        }

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
          await recordAttempt(false);
          recordFailedAttempt(ip);
          return null;
        }

        const passwordValid = await compare(password, user.password);
        if (!passwordValid) {
          await recordAttempt(false);
          recordFailedAttempt(ip);
          return null;
        }

        // Admin portal: only ADMIN accounts allowed
        if (loginType === "admin" && user.role !== "ADMIN") {
          await recordAttempt(false);
          throw new Error("NOT_ADMIN");
        }
        // Client portal: anyone (CLIENT or ADMIN) can connect — portal determines the interface

        // 2FA verification
        if (user.totpEnabled && user.totpSecret) {
          if (!totpCode) {
            throw new Error("2FA_REQUIRED");
          }

          const verified = speakeasy.totp.verify({
            secret: user.totpSecret,
            encoding: "base32",
            token: totpCode,
            window: 1,
          });

          if (!verified) {
            await recordAttempt(false);
            recordFailedAttempt(ip);
            throw new Error("2FA_INVALID");
          }
        }

        await recordAttempt(true);
        recordSuccessfulAttempt(ip);

        return {
          id: user.id,
          email: user.email,
          name:
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.email,
          role: user.role,
          portal: loginType,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { id: string; role: string; portal: string }).role;
        token.portal = (user as { portal: "admin" | "client" }).portal;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.portal = token.portal as "admin" | "client";
      }
      return session;
    },
  },
};
