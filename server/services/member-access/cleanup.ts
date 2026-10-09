import { getAdminDatabase, getDatabase } from "~/server/utils/database";

// A personal access nobody used for a year goes. The browser cookie ends after 365 days anyway.
export const MEMBER_IDLE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurge = 0;

// Everything in the admin database that belongs to one staff member.
const STAFF_TABLES = ["member_sessions", "member_pins", "member_invites", "push_devices", "push_subscriptions"];

/** Ends personal sessions and drops the push registrations of the app or browser behind them. */
export function deleteSessions(sessionIds: string[]): number {
  const db = getAdminDatabase();
  let deleted = 0;
  db.transaction(() => {
    for (const sessionId of sessionIds) {
      deleted += db.prepare("DELETE FROM member_sessions WHERE session_id = ?").run(sessionId).changes;
      db.prepare("DELETE FROM push_devices WHERE member_session = ?").run(sessionId);
      db.prepare("DELETE FROM push_subscriptions WHERE member_session = ?").run(sessionId);
    }
  })();
  return deleted;
}

/**
 * A removed or deactivated person keeps nothing personal: no session, PIN or open QR code,
 * and no app or browser that still gets the team's pushes in their name.
 */
export function removeStaffAccess(staffId: number): void {
  const db = getAdminDatabase();
  db.transaction(() => {
    for (const table of STAFF_TABLES) {
      db.prepare(`DELETE FROM ${table} WHERE staff_id = ?`).run(staffId);
    }
  })();
}

/**
 * At most hourly: drops idle or revoked sessions, used or expired QR codes and whatever is
 * left of people removed before this cleanup existed.
 */
export function purgeMemberAccess(now = Date.now()): void {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;

  const db = getAdminDatabase();
  const stale = db
    .prepare("SELECT session_id FROM member_sessions WHERE revoked_at IS NOT NULL OR last_seen_at < ?")
    .all(now - MEMBER_IDLE_DAYS * DAY_MS) as Array<{ session_id: string }>;
  deleteSessions(stale.map((row) => row.session_id));
  db.prepare("DELETE FROM member_invites WHERE expires_at <= ? OR used_at IS NOT NULL").run(now);

  const active = new Set(
    (getDatabase().prepare("SELECT staff_id FROM staff WHERE active = 1").all() as Array<{ staff_id: number }>).map(
      (row) => row.staff_id
    )
  );
  const known = db
    .prepare(STAFF_TABLES.map((table) => `SELECT staff_id FROM ${table} WHERE staff_id IS NOT NULL`).join(" UNION "))
    .all() as Array<{ staff_id: number }>;
  for (const { staff_id } of known) {
    if (!active.has(staff_id)) removeStaffAccess(staff_id);
  }
}
