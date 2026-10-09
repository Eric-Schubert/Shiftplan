import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { purgeMemberAccess } from "~/server/services/member-access/cleanup";
import type { DeviceScope, StoredDevice } from "~/server/services/push/types";

const MAX_DEVICES = 5000;
const MAX_DEVICE_TOKEN_LENGTH = 4096;

/** App devices that get pushes. Leftovers of removed people are purged first. */
export function listDevices(): StoredDevice[] {
  purgeMemberAccess();
  return getAdminDatabase()
    .prepare("SELECT token, staff_id, scope FROM push_devices")
    .all() as StoredDevice[];
}

export function countDevices(): number {
  const row = getAdminDatabase()
    .prepare("SELECT COUNT(*) AS count FROM push_devices")
    .get() as { count: number };
  return row.count;
}

/**
 * Native app device with its FCM token. Re-registering updates staff and scope.
 * A device registered with a personal app session always belongs to that person;
 * the client cannot claim someone else.
 */
export function registerDevice(input: unknown, member?: { sessionId: string; staffId: number }): void {
  const device = input as {
    platform?: unknown;
    token?: unknown;
    staffId?: unknown;
    scope?: unknown;
  } | null;
  const invalid = (message: string) => createError({ statusCode: 400, statusMessage: message });

  if (device?.platform !== "ios" && device?.platform !== "android") {
    throw invalid("Unbekannte Plattform");
  }
  const token = device.token;
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_DEVICE_TOKEN_LENGTH ||
    !/^[A-Za-z0-9:_-]+$/.test(token)
  ) {
    throw invalid("Ungültiges Geräte-Token");
  }

  if (device.scope !== undefined && device.scope !== "all" && device.scope !== "mine") {
    throw invalid("Ungültiger Benachrichtigungsumfang");
  }
  const scope: DeviceScope = device.scope === "mine" ? "mine" : "all";

  let staffId: number | null = member?.staffId ?? null;
  if (!member && device.staffId !== undefined && device.staffId !== null) {
    const exists =
      Number.isInteger(device.staffId) &&
      getDatabase().prepare("SELECT 1 FROM staff WHERE staff_id = ?").get(device.staffId);
    if (!exists) throw invalid("Unbekannter Mitarbeiter");
    staffId = device.staffId as number;
  }
  if (scope === "mine" && staffId === null) {
    throw invalid("Für „nur meine Schichten“ fehlt der Mitarbeiter");
  }

  const db = getAdminDatabase();
  const exists = db.prepare("SELECT 1 FROM push_devices WHERE token = ?").get(token);
  if (!exists && countDevices() >= MAX_DEVICES) {
    throw createError({ statusCode: 429, statusMessage: "Zu viele registrierte Geräte" });
  }

  db.prepare(
    `
      INSERT INTO push_devices (platform, token, staff_id, scope, member_session)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        platform = excluded.platform,
        staff_id = excluded.staff_id,
        scope = excluded.scope,
        member_session = excluded.member_session,
        updated_at = datetime('now')
    `
  ).run(device.platform, token, staffId, scope, member?.sessionId ?? null);
}

export function removeDevice(token: unknown): void {
  if (typeof token !== "string" || token.length > MAX_DEVICE_TOKEN_LENGTH) return;
  getAdminDatabase().prepare("DELETE FROM push_devices WHERE token = ?").run(token);
}
