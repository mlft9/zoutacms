import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      portal: "admin" | "client";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    portal: "admin" | "client";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    portal: "admin" | "client";
  }
}
