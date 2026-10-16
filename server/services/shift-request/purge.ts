import { getDatabase } from "~/server/utils/database";
import { REQUEST_MESSAGE_RETENTION_DAYS } from "~/shared/utils/retention";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Forgets the message of requests whose last day is past the retention period; the request itself stays. Run by the housekeeping job. */
export function purgeOldMessages(now = Date.now()): void {
  const cutoff = new Date(now - REQUEST_MESSAGE_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 10);
  getDatabase().prepare("UPDATE shift_requests SET message = NULL WHERE message IS NOT NULL AND date_to < ?").run(cutoff);
}
