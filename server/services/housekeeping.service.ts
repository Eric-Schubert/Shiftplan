import { purgeOldReasons } from "~/server/services/absence.service";
import { purgeOldAuditEntries } from "~/server/services/audit.service";
import { purgeOldContactMessages } from "~/server/services/contact.service";
import { purgeMemberAccess } from "~/server/services/member-access.service";
import { purgeOldMessages } from "~/server/services/shift-request.service";

/** The purges run once when the server starts and then this often (server/plugins/housekeeping.ts). */
export const HOUSEKEEPING_INTERVAL_MS = 60 * 60 * 1000;

export type HousekeepingJob = { name: string; run: (now: number) => void };

/** Every purge that removes personal data once its period from shared/utils/retention.ts is over. */
export const HOUSEKEEPING_JOBS: readonly HousekeepingJob[] = [
  { name: "audit entries", run: purgeOldAuditEntries },
  { name: "absence reasons", run: purgeOldReasons },
  { name: "request messages", run: purgeOldMessages },
  { name: "contact messages", run: purgeOldContactMessages },
  { name: "member access", run: purgeMemberAccess },
];

/** Runs every job. A failing job is logged and does not stop the others. */
export function runHousekeeping(now = Date.now(), jobs = HOUSEKEEPING_JOBS, log: (message: string, error: unknown) => void = console.error): void {
  for (const job of jobs) {
    try {
      job.run(now);
    } catch (error) {
      log(`[housekeeping] ${job.name}: purge failed`, error);
    }
  }
}
