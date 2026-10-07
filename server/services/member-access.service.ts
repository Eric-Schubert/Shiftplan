import { createHash, randomBytes, randomInt } from "crypto";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;
export const INVITE_VALID_DAYS = 7;
const INVITE_VALID_MS = INVITE_VALID_DAYS * 24 * 60 * 60 * 1000;
const LAST_SEEN_INTERVAL_MS = 60 * 60 * 1000;
export const DEVICE_NAME_MAX_LENGTH = 60;

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

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, "");
}

function getBearerToken(event: any): string | undefined {
  const header = getHeader(event, "authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

/**
 * Public demo only: a reusable code (`SHIFTPLAN_DEMO_MEMBER_CODE`) that signs in as one
 * demo person, so store reviewers and visitors can try the app without a QR code.
 */
function demoStaffId(code: string): number | null {
  const demoCode = process.env.SHIFTPLAN_DEMO_MEMBER_CODE?.trim();
  if (!demoCode || normalizeCode(code) !== normalizeCode(demoCode)) return null;
  const name = process.env.SHIFTPLAN_DEMO_MEMBER_NAME?.trim();
  const row = getDatabase()
    .prepare(
      name
        ? "SELECT staff_id FROM staff WHERE active = 1 AND name = ?"
        : "SELECT staff_id FROM staff WHERE active = 1 ORDER BY staff_id LIMIT 1"
    )
    .get(...(name ? [name] : [])) as { staff_id: number } | undefined;
  return row?.staff_id ?? null;
}

function staffName(staffId: number): string | null {
  const row = getDatabase()
    .prepare("SELECT name FROM staff WHERE staff_id = ? AND active = 1")
    .get(staffId) as { name: string } | undefined;
  return row?.name ?? null;
}

/**
 * Personal app access: a planner creates a one-time QR code for one staff member,
 * the app redeems it for a long-lived token bound to that person.
 */
export const MemberAccessService = {
  createInvite(staffId: number, createdBy: string): { code: string; expiresAt: number } {
    if (!staffName(staffId)) {
      throw createError({ statusCode: 404, statusMessage: "Mitarbeiter nicht gefunden oder inaktiv" });
    }

    let code = "";
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }

    const now = Date.now();
    const db = getAdminDatabase();
    db.prepare("DELETE FROM member_invites WHERE expires_at <= ? OR used_at IS NOT NULL").run(now);
    db.prepare(
      "INSERT INTO member_invites (staff_id, code_hash, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
    ).run(staffId, sha256(code), createdBy, now, now + INVITE_VALID_MS);

    return { code, expiresAt: now + INVITE_VALID_MS };
  },

  redeem(code: string, deviceName: string | null): { token: string; member: Member } | null {
    const db = getAdminDatabase();
    const now = Date.now();
    const demoStaff = demoStaffId(code);
    const invite =
      demoStaff !== null
        ? { invite_id: null, staff_id: demoStaff }
        : (db
            .prepare(
              "SELECT invite_id, staff_id FROM member_invites WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?"
            )
            .get(sha256(normalizeCode(code)), now) as { invite_id: number; staff_id: number } | undefined);
    if (!invite) return null;

    const name = staffName(invite.staff_id);
    if (!name) return null;

    const token = randomBytes(32).toString("hex");
    const sessionId = randomBytes(9).toString("base64url");
    db.transaction(() => {
      // The demo code stays valid for everyone.
      if (invite.invite_id !== null) {
        db.prepare("UPDATE member_invites SET used_at = ? WHERE invite_id = ?").run(now, invite.invite_id);
      }
      db.prepare(
        `
          INSERT INTO member_sessions (session_id, token_hash, staff_id, device_name, created_at, last_seen_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      ).run(sessionId, sha256(token), invite.staff_id, deviceName, now, now);
    })();

    return { token, member: { sessionId, staffId: invite.staff_id, staffName: name } };
  },

  /** Resolves the Bearer token of the app to a staff member, if it belongs to an active session. */
  getMember(event: any): Member | null {
    const token = getBearerToken(event);
    if (!token) return null;

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
  },

  requireMember(event: any): Member {
    const member = this.getMember(event);
    if (!member) {
      throw createError({ statusCode: 401, statusMessage: "App-Zugang ungültig oder gesperrt" });
    }
    return member;
  },

  listSessions(staffId?: number): MemberSession[] {
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
  },

  /** Revoking a device also drops its push registration. */
  revokeSession(sessionId: string): boolean {
    const db = getAdminDatabase();
    const result = db
      .prepare("UPDATE member_sessions SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL")
      .run(Date.now(), sessionId);
    db.prepare("DELETE FROM push_devices WHERE member_session = ?").run(sessionId);
    return result.changes > 0;
  },
};
