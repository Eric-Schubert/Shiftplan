import { getDatabase } from "~/server/utils/database";

// A message may say why someone is away, so it goes as early as the reason of an absence.
export const MESSAGE_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurge = 0;

export function purgeOldMessages(now = Date.now()): void {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  const cutoff = new Date(now - MESSAGE_RETENTION_DAYS * DAY_MS).toISOString().slice(0, 10);
  getDatabase()
    .prepare("UPDATE shift_requests SET message = NULL WHERE message IS NOT NULL AND date_to < ?")
    .run(cutoff);
}
