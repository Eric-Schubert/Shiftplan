import type { SessionUser } from "~/types/auth";
import { getAdminDatabase } from "~/server/utils/database";
import { getSessionDurationMs } from "~/server/config/auth-config";

export type SessionClient = "web" | "app";

export type PersistedSession = {
  user_id: number;
  username: string;
  role: SessionUser["role"];
  csrf_token: string;
  created_at: number;
  expires_at: number;
  last_activity: number;
  client: SessionClient;
};

// Planners stay signed in on their phone; the device lock protects the app.
const APP_SESSION_MS = 14 * 24 * 60 * 60 * 1000;

export function sessionDurationMs(client: SessionClient): number {
  return client === "app" ? APP_SESSION_MS : getSessionDurationMs();
}

export function cleanupExpiredSessions(now = Date.now()): void {
  getAdminDatabase().prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").run(now);
}

export function getSessionRecord(token: string | undefined): PersistedSession | null {
  if (!token) return null;

  const session = getAdminDatabase()
    .prepare(
      `
        SELECT user_id, username, role, csrf_token, created_at, expires_at, last_activity, client
        FROM auth_sessions
        WHERE session_token = ?
      `
    )
    .get(token) as PersistedSession | undefined;

  return session || null;
}

export function toSessionUser(session: PersistedSession): SessionUser {
  return {
    userId: session.user_id,
    username: session.username,
    role: session.role,
  };
}
