import { randomBytes } from "crypto";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { deleteSessions, purgeMemberAccess } from "~/server/services/member-access/cleanup";
import { sha256, staffName } from "~/server/services/member-access/common";
import { getMemberToken } from "~/server/services/member-access/token";

const LAST_SEEN_INTERVAL_MS = 60 * 60 * 1000;

export type Member = {
  sessionId: string;
  staffId: number;
  staffName: string;
};

export type MemberSession = {
  sessionId: string;
  staffId: number;
  staffName: string;
  deviceName: string | null;
  createdAt: number;
  lastSeenAt: number;
};

export function createSession(staffId: number, name: string, deviceName: string | null): { token: string; member: Member } {
  const token = randomBytes(32).toString("hex");
  const sessionId = randomBytes(9).toString("base64url");
  const now = Date.now();
  getAdminDatabase()
    .prepare(
      `
        INSERT INTO member_sessions (session_id, token_hash, staff_id, device_name, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run(sessionId, sha256(token), staffId, deviceName, now, now);
  return { token, member: { sessionId, staffId, staffName: name } };
}

/** Resolves the app token or the browser cookie to a staff member with an active session. */
export function getMember(event: any): Member | null {
  const token = getMemberToken(event)?.token;
  if (!token) return null;

  purgeMemberAccess();
  const db = getAdminDatabase();
  const session = db
    .prepare(
      "SELECT session_id, staff_id, last_seen_at FROM member_sessions WHERE token_hash = ? AND revoked_at IS NULL"
    )
    .get(sha256(token)) as { session_id: string; staff_id: number; last_seen_at: number } | undefined;
  if (!session) return null;

  const name = staffName(session.staff_id);
  if (!name) return null;

  const now = Date.now();
  if (now - session.last_seen_at > LAST_SEEN_INTERVAL_MS) {
    db.prepare("UPDATE member_sessions SET last_seen_at = ? WHERE session_id = ?").run(now, session.session_id);
  }
  return { sessionId: session.session_id, staffId: session.staff_id, staffName: name };
}

export function requireMember(event: any): Member {
  const member = getMember(event);
  if (!member) {
    throw createError({ statusCode: 401, statusMessage: "Nicht angemeldet oder Zugang gesperrt" });
  }
  return member;
}

export function listSessions(staffId?: number): MemberSession[] {
  purgeMemberAccess();
  const rows = getAdminDatabase()
    .prepare(
      `
        SELECT session_id, staff_id, device_name, created_at, last_seen_at
        FROM member_sessions
        WHERE revoked_at IS NULL ${staffId ? "AND staff_id = ?" : ""}
        ORDER BY last_seen_at DESC
      `
    )
    .all(...(staffId ? [staffId] : [])) as Array<{
    session_id: string;
    staff_id: number;
    device_name: string | null;
    created_at: number;
    last_seen_at: number;
  }>;

  const names = new Map(
    (getDatabase().prepare("SELECT staff_id, name FROM staff").all() as Array<{ staff_id: number; name: string }>).map(
      (row) => [row.staff_id, row.name]
    )
  );

  return rows.map((row) => ({
    sessionId: row.session_id,
    staffId: row.staff_id,
    staffName: names.get(row.staff_id) ?? "Unbekannt",
    deviceName: row.device_name,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  }));
}

/** Revoking or signing out deletes the session and the push registrations made with it. */
export function revokeSession(sessionId: string): boolean {
  return deleteSessions([sessionId]) > 0;
}
