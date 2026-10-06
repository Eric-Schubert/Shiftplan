import { randomBytes, randomInt, timingSafeEqual } from "crypto";
import { getAdminDatabase } from "~/server/utils/database";
import { getSessionData, getSessionToken } from "~/server/utils/session";

const ACCESS_CODE_SETTING = "viewer_access_code";
const INSTANCE_NAME_SETTING = "instance_name";
const INSTANCE_ID_SETTING = "instance_uid";
const DEFAULT_INSTANCE_NAME = "Schichtplaner";
export const INSTANCE_NAME_MAX_LENGTH = 80;
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

function getSetting(key: string): string | null {
  const row = getAdminDatabase()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value || null;
}

function getBearerToken(event: any): string | undefined {
  const header = getHeader(event, "authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export const TeamAccessService = {
  /** Stable random ID, so the app can tell which saved instance a push belongs to. */
  getInstanceId(): string {
    const existing = getSetting(INSTANCE_ID_SETTING);
    if (existing) return existing;

    const id = randomBytes(12).toString("base64url");
    getAdminDatabase()
      .prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
      .run(INSTANCE_ID_SETTING, id);
    return getSetting(INSTANCE_ID_SETTING)!;
  },

  getInstanceName(): string {
    return getSetting(INSTANCE_NAME_SETTING) || DEFAULT_INSTANCE_NAME;
  },

  setInstanceName(name: string): void {
    getAdminDatabase()
      .prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
      .run(INSTANCE_NAME_SETTING, name);
  },

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

  createViewerSession(): { token: string; expiresAt: number } {
    const db = getAdminDatabase();
    const now = Date.now();
    db.prepare("DELETE FROM viewer_sessions WHERE expires_at <= ?").run(now);

    const token = randomBytes(32).toString("hex");
    const expiresAt = now + VIEWER_SESSION_MS;
    db.prepare(
      "INSERT INTO viewer_sessions (session_token, created_at, expires_at) VALUES (?, ?, ?)"
    ).run(token, now, expiresAt);
    return { token, expiresAt };
  },

  destroyViewerSession(token: string | undefined): void {
    if (!token) return;
    getAdminDatabase().prepare("DELETE FROM viewer_sessions WHERE session_token = ?").run(token);
  },

  /** Browser sends the cookie, the app sends the token as Bearer header. */
  getViewerToken(event: any): string | undefined {
    return getBearerToken(event) || getCookie(event, VIEWER_COOKIE_NAME);
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
