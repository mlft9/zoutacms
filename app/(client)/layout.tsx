import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Providers } from "@/app/providers";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");

  return (
    <Providers>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        <Sidebar role="CLIENT" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            user={{
              name: session.user.name,
              email: session.user.email,
              role: session.user.role,
            }}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
