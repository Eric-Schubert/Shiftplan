import { getDatabase } from "~/server/utils/database";

// Reasons and notes are only kept as long as planning needs them.
const REASON_RETENTION_DAYS = 90;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurge = 0;

export function purgeOldReasons(now = Date.now()): void {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  getDatabase()
    .prepare(
      `
        UPDATE absences SET reason = NULL, note = NULL
        WHERE (reason IS NOT NULL OR note IS NOT NULL)
          AND absence_date < date('now', ?)
      `
    )
    .run(`-${REASON_RETENTION_DAYS} days`);
}
