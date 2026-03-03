import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { TwoFASection } from "./two-fa-section";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      totpEnabled: true,
      role: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mon profil
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gérez vos informations personnelles et la sécurité de votre compte
        </p>
      </div>

      <ProfileForm user={user} />
      <PasswordForm />
      <TwoFASection totpEnabled={user.totpEnabled} />
    </div>
  );
}
