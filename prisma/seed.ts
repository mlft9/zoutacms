import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin is created via the setup wizard (/setup), not by the seed.

  // Create test client users
  const clientPassword = await hash("Client@123!", 12);

  const client1 = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      password: clientPassword,
      firstName: "Alice",
      lastName: "Martin",
      role: "CLIENT",
    },
  });
  console.log(`✅ Client créé : ${client1.email}`);

  const client2 = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      password: clientPassword,
      firstName: "Bob",
      lastName: "Dupont",
      role: "CLIENT",
    },
  });
  console.log(`✅ Client créé : ${client2.email}`);

  console.log("\n🎉 Seed terminé !");
  console.log("\nComptes de test disponibles :");
  console.log("  Client : alice@example.com / Client@123!");
  console.log("  Client : bob@example.com / Client@123!");
  console.log("\n⚠️  Le compte admin se crée via le wizard /setup");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
