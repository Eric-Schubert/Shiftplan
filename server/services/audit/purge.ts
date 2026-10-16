import { getDatabase } from "~/server/utils/database";
import { AUDIT_RETENTION_DAYS } from "~/shared/utils/retention";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deletes change log entries older than the retention period. Run by the housekeeping job. */
export function purgeOldAuditEntries(now = Date.now()): void {
  // Same format as SQLite's datetime('now'): "YYYY-MM-DD HH:MM:SS" in UTC.
  const cutoff = new Date(now - AUDIT_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 19).replace("T", " ");
  getDatabase().prepare("DELETE FROM audit_log WHERE created_at < ?").run(cutoff);
}
