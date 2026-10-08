import { randomInt } from "crypto";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { sha256, staffName } from "~/server/services/member-access/common";
import { createSession, type Member } from "~/server/services/member-access/sessions";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;
export const INVITE_VALID_DAYS = 7;
const INVITE_VALID_MS = INVITE_VALID_DAYS * 24 * 60 * 60 * 1000;

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, "");
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

export function createInvite(staffId: number, createdBy: string): { code: string; expiresAt: number } {
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
}

export function redeem(code: string, deviceName: string | null): { token: string; member: Member } | null {
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
    return createSession(invite.staff_id, name, deviceName);
  })();
}
