import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const SETUP_COMPLETE_FILE = path.join(process.cwd(), ".setup-complete");
const SETUP_PROGRESS_FILE = path.join(process.cwd(), ".setup-progress.json");

export interface SetupProgress {
  step: number;
  dbChanged?: boolean;
}

export function isSetupComplete(): boolean {
  try {
    return fs.existsSync(SETUP_COMPLETE_FILE);
  } catch {
    return false;
  }
}

/**
 * DB-level setup check. Used in API routes (Node.js runtime) as a
 * second line of defense: even if .setup-complete is deleted,
 * the DB flag prevents re-running the wizard.
 */
export async function isSetupCompleteInDb(): Promise<boolean> {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "singleton" },
      select: { isSetupComplete: true },
    });
    return settings?.isSetupComplete === true;
  } catch {
    // DB unreachable — fall back to file check
    return isSetupComplete();
  }
}

/**
 * Returns true if setup is done by either the file OR the DB flag.
 * Use this in all setup API routes.
 */
export async function isSetupDone(): Promise<boolean> {
  if (isSetupComplete()) return true;
  return isSetupCompleteInDb();
}

export function markSetupComplete(): void {
  fs.writeFileSync(SETUP_COMPLETE_FILE, new Date().toISOString(), "utf-8");
  // Remove progress file if it exists
  try {
    if (fs.existsSync(SETUP_PROGRESS_FILE)) {
      fs.unlinkSync(SETUP_PROGRESS_FILE);
    }
  } catch {
    // Ignore
  }
}

export function getSetupProgress(): SetupProgress {
  try {
    if (fs.existsSync(SETUP_PROGRESS_FILE)) {
      const raw = fs.readFileSync(SETUP_PROGRESS_FILE, "utf-8");
      return JSON.parse(raw) as SetupProgress;
    }
  } catch {
    // Ignore parse errors
  }
  return { step: 1 };
}

export function saveSetupProgress(progress: SetupProgress): void {
  fs.writeFileSync(SETUP_PROGRESS_FILE, JSON.stringify(progress), "utf-8");
}

/**
 * Masks a PostgreSQL URL for display purposes.
 * postgresql://user:password@host:port/db → postgresql://***@host:port/db
 */
export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.password = "***";
    parsed.username = "***";
    return parsed.toString();
  } catch {
    return "URL invalide";
  }
}

/**
 * Writes a new DATABASE_URL to .env.local (creates it if needed).
 * The Next.js server must be restarted for the change to take effect.
 */
export function saveDatabaseUrl(newUrl: string): void {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  let content = "";

  if (fs.existsSync(envLocalPath)) {
    content = fs.readFileSync(envLocalPath, "utf-8");
    // Replace existing DATABASE_URL line
    if (/^DATABASE_URL=/m.test(content)) {
      content = content.replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${newUrl}"`);
    } else {
      content += `\nDATABASE_URL="${newUrl}"\n`;
    }
  } else {
    content = `DATABASE_URL="${newUrl}"\n`;
  }

  fs.writeFileSync(envLocalPath, content, "utf-8");
}
