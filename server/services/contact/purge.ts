import { getAdminDatabase } from "~/server/utils/database";

// Contact requests are answered by e-mail. After a year the copy in the admin area goes.
export const CONTACT_RETENTION_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurge = 0;

export function purgeOldContactMessages(now = Date.now()): void {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  // Same format as SQLite's datetime('now'): "YYYY-MM-DD HH:MM:SS" in UTC.
  const cutoff = new Date(now - CONTACT_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 19).replace("T", " ");
  getAdminDatabase().prepare("DELETE FROM contact_messages WHERE created_at < ?").run(cutoff);
}
