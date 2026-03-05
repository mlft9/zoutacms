import { prisma } from "@/lib/prisma";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  blocked: boolean;
  retryAfter?: number;
}

/**
 * Check if an IP is currently rate limited (read-only, no increment).
 * Only failed attempts (via recordFailedAttempt) consume credits.
 */
export async function checkRateLimit(
  ip: string,
  maxPerWindow = 5,
  _maxConsecutiveFails = 10,
  _blockDurationMs = 15 * 60 * 1000,
): Promise<RateLimitResult> {
  const now = new Date();

  const entry = await prisma.rateLimitEntry.findUnique({ where: { ip } });

  // Check if currently blocked
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      success: false,
      limit: maxPerWindow,
      remaining: 0,
      resetAt: entry.blockedUntil.getTime(),
      blocked: true,
      retryAfter: Math.ceil((entry.blockedUntil.getTime() - now.getTime()) / 1000),
    };
  }

  // Window expired or no entry → not rate limited
  if (!entry || entry.resetAt <= now) {
    return {
      success: true,
      limit: maxPerWindow,
      remaining: maxPerWindow,
      resetAt: new Date(now.getTime() + 60 * 1000).getTime(),
      blocked: false,
    };
  }

  const remaining = Math.max(0, maxPerWindow - entry.count);

  if (entry.count >= maxPerWindow) {
    return {
      success: false,
      limit: maxPerWindow,
      remaining: 0,
      resetAt: entry.resetAt.getTime(),
      blocked: false,
      retryAfter: Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000),
    };
  }

  return {
    success: true,
    limit: maxPerWindow,
    remaining,
    resetAt: entry.resetAt.getTime(),
    blocked: false,
  };
}

/**
 * Record a failed login attempt. Blocks the IP after maxConsecutiveFails.
 */
export async function recordFailedAttempt(
  ip: string,
  maxConsecutiveFails = 10,
  blockDurationMs = 15 * 60 * 1000,
): Promise<void> {
  const now = new Date();
  const windowMs = 60 * 1000;

  const entry = await prisma.rateLimitEntry.findUnique({ where: { ip } });
  const currentFailures = entry?.consecutiveFailures ?? 0;
  const newFailures = currentFailures + 1;
  const shouldBlock = newFailures >= maxConsecutiveFails;
  const windowExpired = !entry || entry.resetAt <= now;

  await prisma.rateLimitEntry.upsert({
    where: { ip },
    create: {
      ip,
      count: 1,
      resetAt: new Date(now.getTime() + windowMs),
      consecutiveFailures: shouldBlock ? 0 : 1,
      blockedUntil: shouldBlock ? new Date(now.getTime() + blockDurationMs) : null,
    },
    update: {
      count: windowExpired ? 1 : { increment: 1 },
      resetAt: windowExpired ? new Date(now.getTime() + windowMs) : undefined,
      consecutiveFailures: shouldBlock ? 0 : { increment: 1 },
      blockedUntil: shouldBlock ? new Date(now.getTime() + blockDurationMs) : undefined,
    },
  });
}

/**
 * Reset consecutive failures on successful login.
 */
export async function recordSuccessfulAttempt(ip: string): Promise<void> {
  await prisma.rateLimitEntry.upsert({
    where: { ip },
    create: {
      ip,
      count: 1,
      resetAt: new Date(),
      consecutiveFailures: 0,
      blockedUntil: null,
    },
    update: {
      consecutiveFailures: 0,
      blockedUntil: null,
    },
  });
}
