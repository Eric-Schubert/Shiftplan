import { getAdminDatabase } from "~/server/utils/database";
import { CONTACT_RETENTION_DAYS } from "~/shared/utils/retention";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deletes contact requests older than the retention period. Run by the housekeeping job. */
export function purgeOldContactMessages(now = Date.now()): void {
  // Same format as SQLite's datetime('now'): "YYYY-MM-DD HH:MM:SS" in UTC.
  const cutoff = new Date(now - CONTACT_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 19).replace("T", " ");
  getAdminDatabase().prepare("DELETE FROM contact_messages WHERE created_at < ?").run(cutoff);
}
