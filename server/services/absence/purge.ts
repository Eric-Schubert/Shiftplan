import { getDatabase } from "~/server/utils/database";
import { ABSENCE_REASON_RETENTION_DAYS } from "~/shared/utils/retention";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Drops reason and note of old absences and deletes withdrawn ones once the retention period is over. Run by the housekeeping job. */
export function purgeOldReasons(now = Date.now()): void {
  const cutoff = new Date(now - ABSENCE_REASON_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 10);
  const db = getDatabase();
  db.prepare("UPDATE absences SET reason = NULL, note = NULL WHERE (reason IS NOT NULL OR note IS NOT NULL) AND absence_date < ?").run(cutoff);
  db.prepare("DELETE FROM absences WHERE cancelled_at IS NOT NULL AND absence_date < ?").run(cutoff);
}
