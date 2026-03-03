/**
 * Simple in-memory rate limiter for auth routes.
 * For production, replace with Redis-backed solution (Upstash, etc.)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  consecutiveFailures: number;
  blockedUntil?: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (
          entry.resetAt < now &&
          (!entry.blockedUntil || entry.blockedUntil < now)
        ) {
          store.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  ); // every 5 minutes
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  blocked: boolean;
  retryAfter?: number;
}

/**
 * Check rate limit for login attempts.
 * @param ip - IP address
 * @param maxPerMinute - max attempts per minute (default: 5)
 * @param maxConsecutiveFails - block after this many consecutive failures (default: 10)
 * @param blockDurationMs - block duration in ms (default: 15 min)
 */
export function checkRateLimit(
  ip: string,
  maxPerMinute = 5,
  maxConsecutiveFails = 10,
  blockDurationMs = 15 * 60 * 1000,
): RateLimitResult {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  let entry = store.get(ip);

  // Check if blocked
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      success: false,
      limit: maxPerMinute,
      remaining: 0,
      resetAt: entry.blockedUntil,
      blocked: true,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Reset window if expired
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs, consecutiveFailures: 0 };
  }

  entry.count++;
  store.set(ip, entry);

  const remaining = Math.max(0, maxPerMinute - entry.count);

  if (entry.count > maxPerMinute) {
    return {
      success: false,
      limit: maxPerMinute,
      remaining: 0,
      resetAt: entry.resetAt,
      blocked: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    success: true,
    limit: maxPerMinute,
    remaining,
    resetAt: entry.resetAt,
    blocked: false,
  };
}

/**
 * Record a failed login attempt for the IP.
 * Blocks the IP after maxConsecutiveFails.
 */
export function recordFailedAttempt(
  ip: string,
  maxConsecutiveFails = 10,
  blockDurationMs = 15 * 60 * 1000,
): void {
  const now = Date.now();
  const windowMs = 60 * 1000;

  let entry = store.get(ip);
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs, consecutiveFailures: 0 };
  }

  entry.consecutiveFailures++;

  if (entry.consecutiveFailures >= maxConsecutiveFails) {
    entry.blockedUntil = now + blockDurationMs;
    entry.consecutiveFailures = 0; // reset after blocking
  }

  store.set(ip, entry);
}

/**
 * Reset consecutive failures on successful login.
 */
export function recordSuccessfulAttempt(ip: string): void {
  const entry = store.get(ip);
  if (entry) {
    entry.consecutiveFailures = 0;
    entry.blockedUntil = undefined;
    store.set(ip, entry);
  }
}
