import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Authentification",
    template: "%s — ZoutaCMS",
  },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect anyone already authenticated in client portal
  if (session && session.user?.portal === "client") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Auth header */}
      <header className="flex h-16 items-center px-6 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900 dark:text-white">ZoutaCMS</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 dark:text-gray-600">
        &copy; {new Date().getFullYear()} ZoutaCMS
      </footer>
    </div>
  );
}
