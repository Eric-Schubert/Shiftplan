import { getDatabase } from "~/server/utils/database";

// The change log explains past plans. After two years nobody needs it, the names in it go too.
export const AUDIT_RETENTION_DAYS = 730;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurge = 0;

export function purgeOldAuditEntries(now = Date.now()): void {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  // Same format as SQLite's datetime('now'): "YYYY-MM-DD HH:MM:SS" in UTC.
  const cutoff = new Date(now - AUDIT_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 19).replace("T", " ");
  getDatabase().prepare("DELETE FROM audit_log WHERE created_at < ?").run(cutoff);
}
