import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import Link from "next/link";

export default async function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Already logged in as admin → redirect to admin dashboard
  if (session && session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 dark:bg-gray-950">
      {/* Admin auth header — distinct du portail client */}
      <header className="flex h-16 items-center px-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-white">ZoutaCMS</span>
          <span className="ml-2 rounded-md bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
            Admin
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-600">
        <Link href="/login" className="hover:text-gray-400 transition-colors">
          Espace client →
        </Link>
      </footer>
    </div>
  );
}
