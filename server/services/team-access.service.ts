import { randomBytes, randomInt, timingSafeEqual } from "crypto";
import { getAdminDatabase } from "~/server/utils/database";
import { getSessionData, getSessionToken } from "~/server/utils/session";

const ACCESS_CODE_SETTING = "viewer_access_code";
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GENERATED_CODE_LENGTH = 8;
export const ACCESS_CODE_MIN_LENGTH = 6;
export const ACCESS_CODE_MAX_LENGTH = 64;

export const VIEWER_COOKIE_NAME = "viewer_token";
export const VIEWER_SESSION_DAYS = 180;
const VIEWER_SESSION_MS = VIEWER_SESSION_DAYS * 24 * 60 * 60 * 1000;

// Read-only plan data that the access code protects. Holidays and icons stay public.
const PROTECTED_READ_PREFIXES = ["/api/staff", "/api/shift", "/api/shiftplan", "/api/rotation"];

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export const TeamAccessService = {
  getAccessCode(): string | null {
    const row = getAdminDatabase()
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(ACCESS_CODE_SETTING) as { value: string } | undefined;
    return row?.value || null;
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
   * subscriptions, so former staff stop receiving the plan.
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

  createViewerSession(): string {
    const db = getAdminDatabase();
    const now = Date.now();
    db.prepare("DELETE FROM viewer_sessions WHERE expires_at <= ?").run(now);

    const token = randomBytes(32).toString("hex");
    db.prepare(
      "INSERT INTO viewer_sessions (session_token, created_at, expires_at) VALUES (?, ?, ?)"
    ).run(token, now, now + VIEWER_SESSION_MS);
    return token;
  },

  validateViewerSession(token: string | undefined): boolean {
    if (!token) return false;

    const db = getAdminDatabase();
    const session = db
      .prepare("SELECT expires_at FROM viewer_sessions WHERE session_token = ?")
      .get(token) as { expires_at: number } | undefined;
    if (!session) return false;

    const now = Date.now();
    if (session.expires_at <= now) {
      db.prepare("DELETE FROM viewer_sessions WHERE session_token = ?").run(token);
      return false;
    }

    // Keep devices that are in regular use signed in without a write on every request.
    if (session.expires_at - now < VIEWER_SESSION_MS / 2) {
      db.prepare("UPDATE viewer_sessions SET expires_at = ? WHERE session_token = ?").run(
        now + VIEWER_SESSION_MS,
        token
      );
    }
    return true;
  },

  hasReadAccess(event: any): boolean {
    if (!this.isCodeRequired()) return true;
    if (getSessionData(getSessionToken(event))) return true;
    return this.validateViewerSession(getCookie(event, VIEWER_COOKIE_NAME));
  },

  isProtectedReadRoute(path: string): boolean {
    return PROTECTED_READ_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + "/")
    );
  },
};
