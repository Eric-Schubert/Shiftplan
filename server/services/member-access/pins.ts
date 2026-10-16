import bcrypt from "bcryptjs";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { normalizeShortCode } from "~/server/utils/staff-short-code.js";
import { createSession, type Member } from "~/server/services/member-access/sessions";
import { WEAK_PIN_MESSAGE, isWeakPin } from "~/utils/member-pin";

export const PIN_MIN_LENGTH = 6;
export const PIN_MAX_LENGTH = 12;
const PIN_HASH_COST = 10;
// Compared against when there is no PIN to check, so every check costs the same time.
const DUMMY_PIN_HASH = "$2b$10$lhJ.r4DWfwPlCqLrcMGjQ.luDHeryPcty4RreG2XIp0mP6Cu6Pvhi";

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);
}

export function hasPin(staffId: number): boolean {
  return Boolean(getAdminDatabase().prepare("SELECT 1 FROM member_pins WHERE staff_id = ?").get(staffId));
}

/** Staff ids that have a PIN, for the planner overview. */
export function staffWithPin(): number[] {
  return (getAdminDatabase().prepare("SELECT staff_id FROM member_pins").all() as Array<{ staff_id: number }>).map(
    (row) => row.staff_id
  );
}

export async function setPin(staffId: number, pin: string): Promise<void> {
  if (!isValidPin(pin)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Die PIN braucht ${PIN_MIN_LENGTH} bis ${PIN_MAX_LENGTH} Ziffern`,
    });
  }
  if (isWeakPin(pin)) {
    throw createError({ statusCode: 400, statusMessage: WEAK_PIN_MESSAGE });
  }
  const pinHash = await bcrypt.hash(pin, PIN_HASH_COST);
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
 * Always exactly one bcrypt check, also without a person, without a PIN or with a malformed
 * one, so the answer time reveals neither valid short codes nor who has a PIN.
 */
export async function verifyPin(staffId: number | null, pin: string): Promise<boolean> {
  const row =
    staffId === null
      ? undefined
      : (getAdminDatabase().prepare("SELECT pin_hash FROM member_pins WHERE staff_id = ?").get(staffId) as
          | { pin_hash: string }
          | undefined);
  const pinHash = row && isValidPin(pin) ? row.pin_hash : null;
  const matches = await bcrypt.compare(pin, pinHash ?? DUMMY_PIN_HASH);
  return pinHash !== null && matches;
}

export function clearPin(staffId: number): boolean {
  return getAdminDatabase().prepare("DELETE FROM member_pins WHERE staff_id = ?").run(staffId).changes > 0;
}

/** Short code + PIN from any device. Returns null for an unknown short code or a wrong PIN alike. */
export async function loginWithPin(
  shortCode: string,
  pin: string,
  deviceName: string | null
): Promise<{ token: string; member: Member } | null> {
  const code = normalizeShortCode(shortCode);
  const staff = code
    ? (getDatabase().prepare("SELECT staff_id, name FROM staff WHERE short_code = ? AND active = 1").get(code) as
        | { staff_id: number; name: string }
        | undefined)
    : undefined;
  if (!(await verifyPin(staff?.staff_id ?? null, pin)) || !staff) return null;
  return createSession(staff.staff_id, staff.name, deviceName);
}
