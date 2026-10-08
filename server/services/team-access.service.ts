import { randomInt, timingSafeEqual } from "crypto";
import { getAdminDatabase } from "~/server/utils/database";
import { getSessionData, getSessionToken } from "~/server/utils/session";
import { MemberAccessService } from "~/server/services/member-access.service";
import {
  getInstanceId,
  getInstanceName,
  getSetting,
  setInstanceName,
} from "~/server/services/team-access/settings";
import {
  VIEWER_COOKIE_NAME,
  createViewerSession,
  destroyViewerSession,
  getBearerToken,
  getViewerToken,
  validateViewerSession,
} from "~/server/services/team-access/viewer-session";

export { VIEWER_COOKIE_NAME, VIEWER_SESSION_DAYS } from "~/server/services/team-access/viewer-session";

const ACCESS_CODE_SETTING = "viewer_access_code";
export const INSTANCE_NAME_MAX_LENGTH = 80;
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GENERATED_CODE_LENGTH = 8;
export const ACCESS_CODE_MIN_LENGTH = 6;
export const ACCESS_CODE_MAX_LENGTH = 64;

// Read-only plan data that the access code protects. Holidays and icons stay public.
const PROTECTED_READ_PREFIXES = ["/api/staff", "/api/shift", "/api/shiftplan", "/api/rotation"];

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export const TeamAccessService = {
  getInstanceId,
  getInstanceName,
  setInstanceName,

  getAccessCode(): string | null {
    return getSetting(ACCESS_CODE_SETTING);
  },

  isCodeRequired(): boolean {
    return this.getAccessCode() !== null;
  },

  generateCode(): string {
    let code = "";
    for (let index = 0; index < GENERATED_CODE_LENGTH; index += 1) {
      code += ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)];
    }
    return code;
  },

  /**
   * Setting a new code signs out every employee device and drops their push
   * subscriptions and app devices, so former staff stop receiving the plan.
   */
  setAccessCode(code: string | null): void {
    const db = getAdminDatabase();

    if (code === null) {
      db.prepare("DELETE FROM settings WHERE key = ?").run(ACCESS_CODE_SETTING);
      return;
    }

    const normalized = normalizeCode(code);
    db.transaction(() => {
      db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).run(ACCESS_CODE_SETTING, normalized);
      db.prepare("DELETE FROM viewer_sessions").run();
      db.prepare("DELETE FROM push_subscriptions").run();
      db.prepare("DELETE FROM push_devices").run();
    })();
  },

  verifyCode(input: string): boolean {
    const expected = this.getAccessCode();
    if (!expected) return false;

    const given = Buffer.from(normalizeCode(input));
    const wanted = Buffer.from(expected);
    if (given.length !== wanted.length) return false;
    return timingSafeEqual(given, wanted);
  },

  createViewerSession,
  destroyViewerSession,
  getViewerToken,
  validateViewerSession,

  hasReadAccess(event: any): boolean {
    if (!this.isCodeRequired()) return true;
    if (getSessionData(getSessionToken(event))) return true;
    if (MemberAccessService.getMember(event)) return true;
    return (
      this.validateViewerSession(getBearerToken(event)) ||
      this.validateViewerSession(getCookie(event, VIEWER_COOKIE_NAME))
    );
  },

  isProtectedReadRoute(path: string): boolean {
    return PROTECTED_READ_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + "/")
    );
  },
};
