import type { H3Event } from "h3";
import { randomInt, timingSafeEqual } from "node:crypto";
import { getAdminDatabase } from "~/server/utils/database";
import { instanceLocale } from "~/server/utils/locale";
import { getSessionData, getSessionToken } from "~/server/utils/session";
import { MemberAccessService } from "~/server/services/member-access.service";
import {
  getInstanceId,
  getInstanceName,
  getNextWeekFromSaturday,
  getSetting,
  setInstanceLocale,
  setInstanceName,
  setNextWeekFromSaturday,
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

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export const TeamAccessService = {
  getInstanceId,
  getInstanceName,
  setInstanceName,
  getNextWeekFromSaturday,
  setNextWeekFromSaturday,
  getInstanceLocale: instanceLocale,
  setInstanceLocale,

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
   * Setting a new code signs out every device that only had the team code and drops the
   * push subscriptions and app devices registered without a personal sign-in, so former
   * staff stop receiving the plan. Personal sign-ins and their pushes stay; removing a
   * person ends those on its own.
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
      db.prepare("DELETE FROM push_subscriptions WHERE member_session IS NULL").run();
      db.prepare("DELETE FROM push_devices WHERE member_session IS NULL").run();
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
  getBearerToken,
  getViewerToken,
  validateViewerSession,

  hasReadAccess(event: H3Event): boolean {
    if (!this.isCodeRequired()) return true;
    if (getSessionData(getSessionToken(event))) return true;
    if (MemberAccessService.getMember(event)) return true;
    return (
      this.validateViewerSession(getBearerToken(event)) ||
      this.validateViewerSession(getCookie(event, VIEWER_COOKIE_NAME))
    );
  },
};
