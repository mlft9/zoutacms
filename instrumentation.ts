export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.startsWith("changeme") || key.length < 32) {
    throw new Error(
      "[ZoutaCMS] ENCRYPTION_KEY est manquante ou invalide.\n" +
        "Générez une clé avec : openssl rand -base64 48\n" +
        "Et ajoutez-la dans .env : ENCRYPTION_KEY=<valeur>",
    );
  }

  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret || nextAuthSecret.length < 32) {
    throw new Error(
      "[ZoutaCMS] NEXTAUTH_SECRET est manquante ou trop courte.\n" +
        "Générez une clé avec : openssl rand -base64 48",
    );
  }
}
