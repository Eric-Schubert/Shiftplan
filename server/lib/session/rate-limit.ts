import { getAdminDatabase } from "~/server/utils/database";
import { getLoginRateLimitConfig } from "~/server/config/auth-config";

type PersistedLoginAttempt = {
  count: number;
  first_attempt: number;
  blocked_until: number | null;
};

function cleanupExpiredRateLimits(now = Date.now()): void {
  getAdminDatabase()
    .prepare(
      `
        DELETE FROM login_rate_limits
        WHERE (blocked_until IS NULL AND ? - first_attempt > ?)
           OR (blocked_until IS NOT NULL AND blocked_until <= ?)
      `
    )
    .run(now, getLoginRateLimitConfig().windowMs, now);
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  blockedForSeconds: number;
} {
  const now = Date.now();
  const rateLimit = getLoginRateLimitConfig();
  cleanupExpiredRateLimits(now);

  const record = getAdminDatabase()
    .prepare(
      "SELECT count, first_attempt, blocked_until FROM login_rate_limits WHERE ip = ?"
    )
    .get(ip) as PersistedLoginAttempt | undefined;

  if (!record) {
    return { allowed: true, remainingAttempts: rateLimit.maxAttempts, blockedForSeconds: 0 };
  }

  if (record.blocked_until && now < record.blocked_until) {
    const blockedForSeconds = Math.ceil((record.blocked_until - now) / 1000);
    return { allowed: false, remainingAttempts: 0, blockedForSeconds };
  }

  if (record.blocked_until && now >= record.blocked_until) {
    resetRateLimit(ip);
    return { allowed: true, remainingAttempts: rateLimit.maxAttempts, blockedForSeconds: 0 };
  }

  if (now - record.first_attempt > rateLimit.windowMs) {
    resetRateLimit(ip);
    return { allowed: true, remainingAttempts: rateLimit.maxAttempts, blockedForSeconds: 0 };
  }

  const remainingAttempts = rateLimit.maxAttempts - record.count;
  return { allowed: remainingAttempts > 0, remainingAttempts, blockedForSeconds: 0 };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const rateLimit = getLoginRateLimitConfig();
  cleanupExpiredRateLimits(now);

  const db = getAdminDatabase();
  const record = db
    .prepare(
      "SELECT count, first_attempt, blocked_until FROM login_rate_limits WHERE ip = ?"
    )
    .get(ip) as PersistedLoginAttempt | undefined;

  if (!record || now - record.first_attempt > rateLimit.windowMs) {
    db.prepare(
      `
        INSERT INTO login_rate_limits (ip, count, first_attempt, blocked_until)
        VALUES (?, 1, ?, NULL)
        ON CONFLICT(ip) DO UPDATE SET count = excluded.count, first_attempt = excluded.first_attempt, blocked_until = NULL
      `
    ).run(ip, now);
    return;
  }

  const count = record.count + 1;
  const blockedUntil = count >= rateLimit.maxAttempts ? now + rateLimit.blockMs : null;

  db.prepare(
    `
      UPDATE login_rate_limits
      SET count = ?, first_attempt = ?, blocked_until = ?
      WHERE ip = ?
    `
  ).run(count, record.first_attempt, blockedUntil, ip);
}

export function resetRateLimit(ip: string): void {
  getAdminDatabase().prepare("DELETE FROM login_rate_limits WHERE ip = ?").run(ip);
}
