import { DEFAULT_LOCALE, type AppLocale } from "~/i18n/config";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { purgeMemberAccess } from "~/server/services/member-access.service";
import type { DeviceScope, StoredDevice } from "~/server/services/push/types";
import { apiError } from "~/server/utils/api-error";
import { localeFromTag } from "~/server/utils/locale";
import type { MessageKey } from "~/server/lib/i18n/translate";

// Team devices without a personal sign-in share this cap; personal ones are capped per person.
const MAX_TEAM_DEVICES = 5000;
const MAX_DEVICES_PER_PERSON = 10;
const MAX_DEVICE_TOKEN_LENGTH = 4096;

/** App devices that get pushes. Leftovers of removed people are purged first. */
export function listDevices(): StoredDevice[] {
  purgeMemberAccess();
  return getAdminDatabase()
    .prepare("SELECT token, staff_id, scope, member_session IS NOT NULL AS personal, locale FROM push_devices")
    .all() as StoredDevice[];
}

export function countDevices(): number {
  const row = getAdminDatabase().prepare("SELECT COUNT(*) AS count FROM push_devices").get() as { count: number };
  return row.count;
}

function countTeamDevices(): number {
  const row = getAdminDatabase().prepare("SELECT COUNT(*) AS count FROM push_devices WHERE member_session IS NULL").get() as { count: number };
  return row.count;
}

/**
 * Keeps the newest devices of one person. Personal and team devices are trimmed apart,
 * so someone claiming a colleague in team mode never pushes out that colleague's own phone.
 */
function trimDevicesOfPerson(staffId: number, personal: boolean, keepToken: string): void {
  getAdminDatabase()
    .prepare(
      `
        DELETE FROM push_devices WHERE device_id IN (
          SELECT device_id FROM push_devices
          WHERE staff_id = ? AND (member_session IS NOT NULL) = ? AND token != ?
          ORDER BY updated_at DESC, device_id DESC
          LIMIT -1 OFFSET ?
        )
      `
    )
    .run(staffId, personal ? 1 : 0, keepToken, MAX_DEVICES_PER_PERSON - 1);
}

/**
 * Native app device with its FCM token. Re-registering updates staff, scope and language.
 * A device registered with a personal app session always belongs to that person;
 * the client cannot claim someone else. In team mode the chosen person only filters
 * "only mine" plan changes; personal messages need a personal sign-in.
 * Pushes reach it in the app's `locale` when it sends a supported one, else in `requestLocale`.
 */
export function registerDevice(input: unknown, member?: { sessionId: string; staffId: number }, requestLocale: AppLocale = DEFAULT_LOCALE): void {
  const device = input as {
    platform?: unknown;
    token?: unknown;
    staffId?: unknown;
    scope?: unknown;
    locale?: unknown;
  } | null;
  const invalid = (key: MessageKey) => apiError(null, 400, key);

  if (device?.platform !== "ios" && device?.platform !== "android") {
    throw invalid("errors.push.unknownPlatform");
  }
  const token = device.token;
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_DEVICE_TOKEN_LENGTH || !/^[A-Za-z0-9:_-]+$/.test(token)) {
    throw invalid("errors.push.invalidToken");
  }

  if (device.scope !== undefined && device.scope !== "all" && device.scope !== "mine") {
    throw invalid("errors.push.invalidScope");
  }
  const scope: DeviceScope = device.scope === "mine" ? "mine" : "all";
  const locale = localeFromTag(device.locale) ?? requestLocale;

  // Only active people: a deactivated person's app must not come back in their name.
  let staffId: number | null = member?.staffId ?? null;
  if (!member && device.staffId !== undefined && device.staffId !== null) {
    const exists = Number.isInteger(device.staffId) && getDatabase().prepare("SELECT 1 FROM staff WHERE staff_id = ? AND active = 1").get(device.staffId);
    if (!exists) throw invalid("errors.common.unknownStaff");
    staffId = device.staffId as number;
  }
  if (scope === "mine" && staffId === null) {
    throw invalid("errors.push.scopeNeedsStaff");
  }

  const db = getAdminDatabase();
  const exists = db.prepare("SELECT 1 FROM push_devices WHERE token = ?").get(token);
  if (!exists && !member && countTeamDevices() >= MAX_TEAM_DEVICES) {
    throw apiError(null, 429, "errors.push.tooManyDevices");
  }

  db.transaction(() => {
    db.prepare(
      `
        INSERT INTO push_devices (platform, token, staff_id, scope, member_session, locale)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(token) DO UPDATE SET
          platform = excluded.platform,
          staff_id = excluded.staff_id,
          scope = excluded.scope,
          member_session = excluded.member_session,
          locale = excluded.locale,
          updated_at = datetime('now')
      `
    ).run(device.platform, token, staffId, scope, member?.sessionId ?? null, locale);
    if (staffId !== null) trimDevicesOfPerson(staffId, Boolean(member), token);
  })();
}

export function removeDevice(token: unknown): void {
  if (typeof token !== "string" || token.length > MAX_DEVICE_TOKEN_LENGTH) return;
  getAdminDatabase().prepare("DELETE FROM push_devices WHERE token = ?").run(token);
}
