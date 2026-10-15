import { getAdminDatabase } from "~/server/utils/database";
import { getLoginRateLimitConfig } from "~/server/config/auth-config";

/**
 * One counter of sign-in attempts. `factor` widens the configured limit for a counter that
 * many networks share, e.g. one account; `resetOnSuccess` clears it once the secret was right.
 */
export type AttemptBucket = { key: string; factor?: number; resetOnSuccess?: boolean };

type PersistedAttempts = {
  count: number;
  first_attempt: number;
  blocked_until: number | null;
};

function cleanupExpiredRateLimits(now: number): void {
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

function maxAttempts(bucket: AttemptBucket): number {
  return getLoginRateLimitConfig().maxAttempts * (bucket.factor ?? 1);
}

function readAttempts(key: string): PersistedAttempts | undefined {
  return getAdminDatabase()
    .prepare("SELECT count, first_attempt, blocked_until FROM login_rate_limits WHERE ip = ?")
    .get(key) as PersistedAttempts | undefined;
}

/**
 * Counts the attempt in every bucket before the slow secret check runs, so parallel requests
 * cannot all pass before the first failure is written. Counts nothing when a bucket is used up.
 */
export function reserveAttempt(buckets: AttemptBucket[]): boolean {
  const db = getAdminDatabase();
  const now = Date.now();
  return db.transaction(() => {
    cleanupExpiredRateLimits(now);
    const rows = buckets.map((bucket) => readAttempts(bucket.key));
    const usedUp = rows.some((row, index) => row && (row.blocked_until || row.count >= maxAttempts(buckets[index]!)));
    if (usedUp) return false;

    const upsert = db.prepare(
      `
        INSERT INTO login_rate_limits (ip, count, first_attempt, blocked_until)
        VALUES (?, ?, ?, NULL)
        ON CONFLICT(ip) DO UPDATE SET count = excluded.count, first_attempt = excluded.first_attempt
      `
    );
    buckets.forEach((bucket, index) => {
      upsert.run(bucket.key, (rows[index]?.count ?? 0) + 1, rows[index]?.first_attempt ?? now);
    });
    return true;
  })();
}

/** A failure that fills a bucket blocks it; a success takes the attempt back or clears the bucket. */
export function settleAttempt(buckets: AttemptBucket[], succeeded: boolean): void {
  const db = getAdminDatabase();
  const blockedUntil = Date.now() + getLoginRateLimitConfig().blockMs;
  db.transaction(() => {
    for (const bucket of buckets) {
      if (succeeded && bucket.resetOnSuccess) {
        db.prepare("DELETE FROM login_rate_limits WHERE ip = ?").run(bucket.key);
      } else if (succeeded) {
        db.prepare(
          "UPDATE login_rate_limits SET count = MAX(count - 1, 0) WHERE ip = ? AND blocked_until IS NULL"
        ).run(bucket.key);
      } else {
        db.prepare(
          "UPDATE login_rate_limits SET blocked_until = ? WHERE ip = ? AND blocked_until IS NULL AND count >= ?"
        ).run(blockedUntil, bucket.key, maxAttempts(bucket));
      }
    }
  })();
}

/**
 * Runs one rate-limited secret check. A used-up bucket answers 429 before the check runs;
 * `null` from the check counts as a failed attempt.
 */
export async function limitAttempt<T>(
  buckets: AttemptBucket[],
  check: () => T | null | Promise<T | null>,
  message = "Zu viele Versuche. Bitte warten."
): Promise<T | null> {
  if (!reserveAttempt(buckets)) {
    throw createError({ statusCode: 429, statusMessage: message });
  }
  let result: T | null = null;
  try {
    result = await check();
    return result;
  } finally {
    settleAttempt(buckets, result !== null);
  }
}
