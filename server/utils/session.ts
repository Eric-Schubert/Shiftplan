import { randomBytes, timingSafeEqual } from "crypto";
import type { SessionUser } from "~/types/auth";
import { getAdminDatabase } from "~/server/utils/database";
import { getAuthConfig, getLoginRateLimitConfig, getSessionDurationMs } from "~/server/config/auth-config";

type PersistedSession = {
  user_id: number;
  username: string;
  role: SessionUser["role"];
  csrf_token: string;
  created_at: number;
  expires_at: number;
  last_activity: number;
};

type PersistedLoginAttempt = {
  count: number;
  first_attempt: number;
  blocked_until: number | null;
};

function getAuthDatabase() {
  return getAdminDatabase();
}

function cleanupExpiredSessions(now = Date.now()): void {
  getAuthDatabase().prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").run(now);
}

function cleanupExpiredRateLimits(now = Date.now()): void {
  getAuthDatabase()
    .prepare(
      `
        DELETE FROM login_rate_limits
        WHERE (blocked_until IS NULL AND ? - first_attempt > ?)
           OR (blocked_until IS NOT NULL AND blocked_until <= ?)
      `
    )
    .run(now, getLoginRateLimitConfig().windowMs, now);
}

function getSessionRecord(token: string | undefined): PersistedSession | null {
  if (!token) return null;

  const session = getAuthDatabase()
    .prepare(
      `
        SELECT user_id, username, role, csrf_token, created_at, expires_at, last_activity
        FROM auth_sessions
        WHERE session_token = ?
      `
    )
    .get(token) as PersistedSession | undefined;

  return session || null;
}

function toSessionUser(session: PersistedSession): SessionUser {
  return {
    userId: session.user_id,
    username: session.username,
    role: session.role,
  };
}

export function createSession(user: SessionUser): { sessionToken: string; csrfToken: string } {
  cleanupExpiredSessions();

  const sessionConfig = getAuthConfig().session;
  const sessionToken = randomBytes(sessionConfig.tokenBytes).toString("hex");
  const csrfToken = randomBytes(sessionConfig.csrfTokenBytes).toString("hex");
  const now = Date.now();
  const sessionDuration = getSessionDurationMs();

  getAuthDatabase()
    .prepare(
      `
        INSERT INTO auth_sessions (
          session_token,
          user_id,
          username,
          role,
          csrf_token,
          created_at,
          expires_at,
          last_activity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      sessionToken,
      user.userId,
      user.username,
      user.role,
      csrfToken,
      now,
      now + sessionDuration,
      now
    );

  return { sessionToken, csrfToken };
}

export function validateSession(token: string | undefined): boolean {
  return getSessionData(token) !== null;
}

export function getSessionData(token: string | undefined): SessionUser | null {
  const session = getSessionRecord(token);
  if (!session || !token) return null;

  const now = Date.now();
  if (now > session.expires_at) {
    destroySession(token);
    return null;
  }

  if (getAuthConfig().session.extendOnActivity) {
    const sessionDuration = getSessionDurationMs();
    getAuthDatabase()
      .prepare(
        "UPDATE auth_sessions SET last_activity = ?, expires_at = ? WHERE session_token = ?"
      )
      .run(now, now + sessionDuration, token);
  }

  return toSessionUser(session);
}

export function validateCsrfToken(
  sessionToken: string | undefined,
  csrfToken: string | undefined
): boolean {
  if (!sessionToken || !csrfToken) return false;

  const session = getSessionRecord(sessionToken);
  if (!session) return false;

  const now = Date.now();
  if (now > session.expires_at) {
    destroySession(sessionToken);
    return false;
  }

  if (session.csrf_token.length !== csrfToken.length) return false;

  try {
    return timingSafeEqual(Buffer.from(session.csrf_token), Buffer.from(csrfToken));
  } catch {
    return false;
  }
}

export function getCsrfToken(sessionToken: string | undefined): string | null {
  const session = getSessionRecord(sessionToken);
  if (!session || !sessionToken) return null;

  const now = Date.now();
  if (now > session.expires_at) {
    destroySession(sessionToken);
    return null;
  }

  return session.csrf_token;
}

export function destroySession(token: string | undefined): boolean {
  if (!token) return false;
  const result = getAuthDatabase()
    .prepare("DELETE FROM auth_sessions WHERE session_token = ?")
    .run(token);
  return result.changes > 0;
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  blockedForSeconds: number;
} {
  const now = Date.now();
  const rateLimit = getLoginRateLimitConfig();
  cleanupExpiredRateLimits(now);

  const record = getAuthDatabase()
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

  const db = getAuthDatabase();
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
  getAuthDatabase().prepare("DELETE FROM login_rate_limits WHERE ip = ?").run(ip);
}

export function getSessionToken(event: any): string | undefined {
  const authHeader = getHeader(event, "authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieToken = getCookie(event, getAuthConfig().session.cookies.sessionName);
  if (cookieToken) {
    return cookieToken;
  }

  return undefined;
}

export function getCsrfTokenFromRequest(event: any): string | undefined {
  return getHeader(event, "x-csrf-token") || undefined;
}

export function getClientIP(event: any): string {
  const socketIP = event.node?.req?.socket?.remoteAddress || "unknown";

  if (!getAuthConfig().trustProxyHeaders) {
    return socketIP;
  }

  const cfIP = getHeader(event, "cf-connecting-ip");
  if (cfIP) return cfIP;

  const xForwardedFor = getHeader(event, "x-forwarded-for");
  if (xForwardedFor) {
    const forwardedIp = xForwardedFor.split(",")[0]?.trim();
    if (forwardedIp) return forwardedIp;
  }

  const xRealIP = getHeader(event, "x-real-ip");
  if (xRealIP) return xRealIP;

  return socketIP;
}
