import bcrypt from "bcryptjs";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { normalizeShortCode } from "~/server/utils/staff-short-code.js";
import { createSession, type Member } from "~/server/services/member-access/sessions";

export const PIN_MIN_LENGTH = 6;
export const PIN_MAX_LENGTH = 12;
const PIN_HASH_COST = 10;

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

export function setPin(staffId: number, pin: string): void {
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
}

export function verifyPin(staffId: number, pin: string): boolean {
  const row = getAdminDatabase().prepare("SELECT pin_hash FROM member_pins WHERE staff_id = ?").get(staffId) as
    | { pin_hash: string }
    | undefined;
  return Boolean(row && isValidPin(pin) && bcrypt.compareSync(pin, row.pin_hash));
}

export function clearPin(staffId: number): boolean {
  return getAdminDatabase().prepare("DELETE FROM member_pins WHERE staff_id = ?").run(staffId).changes > 0;
}

/** Kürzel + PIN from any device. Returns null for an unknown Kürzel or a wrong PIN alike. */
export function loginWithPin(shortCode: string, pin: string, deviceName: string | null): { token: string; member: Member } | null {
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
  if (!verifyPin(staff.staff_id, pin)) return null;
  return createSession(staff.staff_id, staff.name, deviceName);
}
