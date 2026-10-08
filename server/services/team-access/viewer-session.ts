import { randomBytes } from "crypto";
import { getAdminDatabase } from "~/server/utils/database";

export const VIEWER_COOKIE_NAME = "viewer_token";
export const VIEWER_SESSION_DAYS = 180;
const VIEWER_SESSION_MS = VIEWER_SESSION_DAYS * 24 * 60 * 60 * 1000;

export function getBearerToken(event: any): string | undefined {
  const header = getHeader(event, "authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export function createViewerSession(): { token: string; expiresAt: number } {
  const db = getAdminDatabase();
  const now = Date.now();
  db.prepare("DELETE FROM viewer_sessions WHERE expires_at <= ?").run(now);

  const token = randomBytes(32).toString("hex");
  const expiresAt = now + VIEWER_SESSION_MS;
  db.prepare(
    "INSERT INTO viewer_sessions (session_token, created_at, expires_at) VALUES (?, ?, ?)"
  ).run(token, now, expiresAt);
  return { token, expiresAt };
}

export function destroyViewerSession(token: string | undefined): void {
  if (!token) return;
  getAdminDatabase().prepare("DELETE FROM viewer_sessions WHERE session_token = ?").run(token);
}

/** Browser sends the cookie, the app sends the token as Bearer header. */
export function getViewerToken(event: any): string | undefined {
  return getBearerToken(event) || getCookie(event, VIEWER_COOKIE_NAME);
}

export function validateViewerSession(token: string | undefined): boolean {
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
}
