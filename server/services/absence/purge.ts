import { getDatabase } from "~/server/utils/database";

// Reasons and notes are only kept as long as planning needs them. Removed absences go then too.
export const REASON_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurge = 0;

export function purgeOldReasons(now = Date.now()): void {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  const cutoff = new Date(now - REASON_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 10);
  const db = getDatabase();
  db.prepare(
    "UPDATE absences SET reason = NULL, note = NULL WHERE (reason IS NOT NULL OR note IS NOT NULL) AND absence_date < ?"
  ).run(cutoff);
  db.prepare("DELETE FROM absences WHERE cancelled_at IS NOT NULL AND absence_date < ?").run(cutoff);
}
