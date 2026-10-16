import type { SessionUser } from "~/types/auth";
import { getAdminDatabase } from "~/server/utils/database";
import { getSessionDurationMs } from "~/server/config/auth-config";
import { PLANNER_APP_SESSION_DAYS } from "~/shared/utils/retention";

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
const APP_SESSION_MS = PLANNER_APP_SESSION_DAYS * 24 * 60 * 60 * 1000;

export function sessionDurationMs(client: SessionClient): number {
  return client === "app" ? APP_SESSION_MS : getSessionDurationMs();
}

export function cleanupExpiredSessions(now = Date.now()): void {
  getAdminDatabase().prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").run(now);
}

export function getSessionRecord(token: string | undefined): PersistedSession | null {
  if (!token) return null;

  // Name and role come from the account, so deleting or deactivating it ends its sessions at once.
  const session = getAdminDatabase()
    .prepare(
      `
        SELECT s.user_id, u.username, u.role, s.csrf_token, s.created_at, s.expires_at, s.last_activity, s.client
        FROM auth_sessions s
        JOIN users u ON u.user_id = s.user_id AND u.active = 1
        WHERE s.session_token = ?
      `
    )
    .get(token) as PersistedSession | undefined;

  return session || null;
}

/** Ends every session of an account, except `keepToken` (the request that changes it). */
export function deleteUserSessions(userId: number, keepToken?: string): number {
  return getAdminDatabase()
    .prepare("DELETE FROM auth_sessions WHERE user_id = ? AND session_token IS NOT ?")
    .run(userId, keepToken ?? null).changes;
}

export function toSessionUser(session: PersistedSession): SessionUser {
  return {
    userId: session.user_id,
    username: session.username,
    role: session.role,
  };
}
