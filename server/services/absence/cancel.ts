import { logPerWeek, type Actor } from "~/server/services/absence/audit";
import type { Absence } from "~/server/services/absence/model";
import { AbsenceService } from "~/server/services/absence/store";
import { ShiftRequestService } from "~/server/services/shift-request.service";
import { planningToday } from "~/server/utils/planning-date";
import { apiError } from "~/server/utils/api-error";

/**
 * Withdraws one day, or the range when `wholeRange` is set. A range that already began is cut back
 * to the days before today, so the past keeps showing who was away. Planners may still remove past
 * days to correct them; staff (`upcomingOnly`) can only withdraw what lies ahead.
 */
export function cancelAbsence(
  absence: Absence,
  actor: Actor,
  options: { wholeRange?: boolean; upcomingOnly?: boolean } = {}
): number {
  const range = options.wholeRange && absence.batch_id ? AbsenceService.listBatch(absence.batch_id) : [absence];
  const today = planningToday();
  const upcoming = range.filter((entry) => entry.absence_date >= today);
  if (options.upcomingOnly && upcoming.length === 0) {
    throw apiError(null, 400, "errors.absences.pastCancel");
  }
  const affected = upcoming.length > 0 ? upcoming : range;
  const ids = affected.map((entry) => entry.absence_id);
  AbsenceService.cancel(ids);
  ShiftRequestService.cancelForAbsence(ids);
  logPerWeek(affected, "absence_cancel", actor);
  return affected.length;
}
