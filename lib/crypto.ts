import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from ENCRYPTION_KEY env var.
 * Uses SHA-256 so the env value can be any length.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.startsWith("changeme")) {
    throw new Error(
      "ENCRYPTION_KEY est manquante ou non configurée. Définissez une clé aléatoire d'au moins 32 caractères dans .env.",
    );
  }
  return createHash("sha256").update(raw).digest();
}

/**
 * Encrypts a plaintext string.
 * Returns a hex string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a string produced by encrypt().
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Format de chiffrement invalide.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

/**
 * Returns true if the string looks like an encrypted value (iv:tag:data).
 * Used to detect legacy plaintext secrets during migration.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2;
}
