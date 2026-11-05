import bcrypt from "bcryptjs";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { normalizeShortCode } from "~/server/lib/migrations/staff-short-code.js";
import { createSession, revokeOtherSessions, type Member } from "~/server/services/member-access/sessions";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH, isValidPin, isWeakPin } from "~/shared/utils/limits";
import { apiError } from "~/server/utils/api-error";

const PIN_HASH_COST = 10;
// Compared against when there is no PIN to check, so every check costs the same time.
const DUMMY_PIN_HASH = "$2b$10$lhJ.r4DWfwPlCqLrcMGjQ.luDHeryPcty4RreG2XIp0mP6Cu6Pvhi";

export function hasPin(staffId: number): boolean {
  return Boolean(getAdminDatabase().prepare("SELECT 1 FROM member_pins WHERE staff_id = ?").get(staffId));
}

/** Staff ids that have a PIN, for the planner overview. */
export function staffWithPin(): number[] {
  return (getAdminDatabase().prepare("SELECT staff_id FROM member_pins").all() as Array<{ staff_id: number }>).map((row) => row.staff_id);
}

async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) {
    throw apiError(null, 400, "errors.member.pinLength", { min: PIN_MIN_LENGTH, max: PIN_MAX_LENGTH });
  }
  if (isWeakPin(pin)) {
    throw apiError(null, 400, "errors.member.pinWeak");
  }
  return bcrypt.hash(pin, PIN_HASH_COST);
}

function storePin(staffId: number, pinHash: string): void {
  getAdminDatabase()
    .prepare(
      `
        INSERT INTO member_pins (staff_id, pin_hash, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(staff_id) DO UPDATE SET pin_hash = excluded.pin_hash, updated_at = excluded.updated_at
      `
    )
    .run(staffId, pinHash, Date.now());
}

/**
 * A signed-in person sets their PIN. The session is checked again in the same transaction as the write:
 * a planner who resets the PIN or blocks the device while the hash is computed wins, and the PIN is not
 * written. The person's other sign-ins end, so a leaked session or PIN stops working everywhere.
 */
export async function setPinForSession(member: Member, pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  const db = getAdminDatabase();
  db.transaction(() => {
    const live = db.prepare("SELECT 1 FROM member_sessions WHERE session_id = ? AND revoked_at IS NULL").get(member.sessionId);
    if (!live) throw apiError(null, 401, "errors.member.notSignedIn");
    storePin(member.staffId, pinHash);
    revokeOtherSessions(member.staffId, member.sessionId);
  })();
}

/**
 * Always exactly one bcrypt check, also without a person, without a PIN or with a malformed
 * one, so the answer time reveals neither valid short codes nor who has a PIN.
 */
export async function verifyPin(staffId: number | null, pin: string): Promise<boolean> {
  const row =
    staffId === null
      ? undefined
      : (getAdminDatabase().prepare("SELECT pin_hash FROM member_pins WHERE staff_id = ?").get(staffId) as { pin_hash: string } | undefined);
  const pinHash = row && isValidPin(pin) ? row.pin_hash : null;
  const matches = await bcrypt.compare(pin, pinHash ?? DUMMY_PIN_HASH);
  return pinHash !== null && matches;
}

export function clearPin(staffId: number): boolean {
  return getAdminDatabase().prepare("DELETE FROM member_pins WHERE staff_id = ?").run(staffId).changes > 0;
}

/** Short code + PIN from any device. Returns null for an unknown short code or a wrong PIN alike. */
export async function loginWithPin(shortCode: string, pin: string, deviceName: string | null): Promise<{ token: string; member: Member } | null> {
  const code = normalizeShortCode(shortCode);
  const staff = code
    ? (getDatabase().prepare("SELECT staff_id, name FROM staff WHERE short_code = ? AND active = 1").get(code) as
        { staff_id: number; name: string } | undefined)
    : undefined;
  if (!(await verifyPin(staff?.staff_id ?? null, pin)) || !staff) return null;
  return createSession(staff.staff_id, staff.name, deviceName);
}
