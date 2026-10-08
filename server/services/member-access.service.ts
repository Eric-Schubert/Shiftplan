import { createHash, randomBytes, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { normalizeShortCode } from "~/server/utils/staff-short-code.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;
export const INVITE_VALID_DAYS = 7;
const INVITE_VALID_MS = INVITE_VALID_DAYS * 24 * 60 * 60 * 1000;
const LAST_SEEN_INTERVAL_MS = 60 * 60 * 1000;
export const DEVICE_NAME_MAX_LENGTH = 60;
export const PIN_MIN_LENGTH = 6;
export const PIN_MAX_LENGTH = 12;
const PIN_HASH_COST = 10;
/** Browser session of a staff member signed in with Kürzel and PIN. */
export const MEMBER_COOKIE_NAME = "member_token";
export const MEMBER_COOKIE_DAYS = 365;

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

/** The app sends its token as Bearer header, a signed-in browser sends the cookie. */
export function getMemberToken(event: any): { token: string; viaCookie: boolean } | null {
  const bearer = getBearerToken(event);
  if (bearer) return { token: bearer, viaCookie: false };
  const cookie = getCookie(event, MEMBER_COOKIE_NAME);
  return cookie ? { token: cookie, viaCookie: true } : null;
}

/** Audit source of a member action: the browser signs in with a cookie, the app with a token. */
export function memberSource(event: any): "web" | "app" {
  return getMemberToken(event)?.viaCookie ? "web" : "app";
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);
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

    return db.transaction(() => {
      // The demo code stays valid for everyone.
      if (invite.invite_id !== null) {
        db.prepare("UPDATE member_invites SET used_at = ? WHERE invite_id = ?").run(now, invite.invite_id);
      }
      return this.createSession(invite.staff_id, name, deviceName);
    })();
  },

  createSession(staffId: number, name: string, deviceName: string | null): { token: string; member: Member } {
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
  },

  hasPin(staffId: number): boolean {
    return Boolean(getAdminDatabase().prepare("SELECT 1 FROM member_pins WHERE staff_id = ?").get(staffId));
  },

  /** Staff ids that have a PIN, for the planner overview. */
  staffWithPin(): number[] {
    return (getAdminDatabase().prepare("SELECT staff_id FROM member_pins").all() as Array<{ staff_id: number }>).map(
      (row) => row.staff_id
    );
  },

  setPin(staffId: number, pin: string): void {
    if (!isValidPin(pin)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Die PIN braucht ${PIN_MIN_LENGTH} bis ${PIN_MAX_LENGTH} Ziffern`,
      });
    }
    getAdminDatabase()
      .prepare(
        `
          INSERT INTO member_pins (staff_id, pin_hash, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(staff_id) DO UPDATE SET pin_hash = excluded.pin_hash, updated_at = excluded.updated_at
        `
      )
      .run(staffId, bcrypt.hashSync(pin, PIN_HASH_COST), Date.now());
  },

  verifyPin(staffId: number, pin: string): boolean {
    const row = getAdminDatabase().prepare("SELECT pin_hash FROM member_pins WHERE staff_id = ?").get(staffId) as
      | { pin_hash: string }
      | undefined;
    return Boolean(row && isValidPin(pin) && bcrypt.compareSync(pin, row.pin_hash));
  },

  clearPin(staffId: number): boolean {
    return getAdminDatabase().prepare("DELETE FROM member_pins WHERE staff_id = ?").run(staffId).changes > 0;
  },

  /** Kürzel + PIN from any device. Returns null for an unknown Kürzel or a wrong PIN alike. */
  loginWithPin(shortCode: string, pin: string, deviceName: string | null): { token: string; member: Member } | null {
    const code = normalizeShortCode(shortCode);
    const staff = code
      ? (getDatabase().prepare("SELECT staff_id, name FROM staff WHERE short_code = ? AND active = 1").get(code) as
          | { staff_id: number; name: string }
          | undefined)
      : undefined;
    if (!staff) {
      // Same work as a real check, so the answer time does not reveal valid Kürzel.
      bcrypt.compareSync(pin, "$2b$10$lhJ.r4DWfwPlCqLrcMGjQ.luDHeryPcty4RreG2XIp0mP6Cu6Pvhi");
      return null;
    }
    if (!this.verifyPin(staff.staff_id, pin)) return null;
    return this.createSession(staff.staff_id, staff.name, deviceName);
  },

  /** Resolves the app token or the browser cookie to a staff member with an active session. */
  getMember(event: any): Member | null {
    const token = getMemberToken(event)?.token;
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
      throw createError({ statusCode: 401, statusMessage: "Nicht angemeldet oder Zugang gesperrt" });
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
