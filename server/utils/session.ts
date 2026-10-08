import { randomBytes, timingSafeEqual } from "crypto";
import type { SessionUser } from "~/types/auth";
import { getAdminDatabase } from "~/server/utils/database";
import { getAuthConfig } from "~/server/config/auth-config";
import {
  cleanupExpiredSessions,
  getSessionRecord,
  sessionDurationMs,
  toSessionUser,
  type SessionClient,
} from "~/server/lib/session/records";

export type { SessionClient } from "~/server/lib/session/records";
export { checkRateLimit, recordFailedLogin, resetRateLimit } from "~/server/lib/session/rate-limit";
export { getClientIP, getCsrfTokenFromRequest, getSessionToken } from "~/server/lib/session/request";

export function createSession(
  user: SessionUser,
  options: { client?: SessionClient } = {}
): { sessionToken: string; csrfToken: string; expiresAt: number } {
  cleanupExpiredSessions();

  const client = options.client ?? "web";
  const sessionConfig = getAuthConfig().session;
  const sessionToken = randomBytes(sessionConfig.tokenBytes).toString("hex");
  const csrfToken = randomBytes(sessionConfig.csrfTokenBytes).toString("hex");
  const now = Date.now();
  const sessionDuration = sessionDurationMs(client);

  getAdminDatabase()
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
          last_activity,
          client
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      now,
      client
    );

  return { sessionToken, csrfToken, expiresAt: now + sessionDuration };
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
    const sessionDuration = sessionDurationMs(session.client ?? "web");
    getAdminDatabase()
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
  const result = getAdminDatabase()
    .prepare("DELETE FROM auth_sessions WHERE session_token = ?")
    .run(token);
  return result.changes > 0;
}
