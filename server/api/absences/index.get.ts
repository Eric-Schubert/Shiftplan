import { AbsenceService } from "~/server/services/absence.service";
import { getSessionUser } from "~/server/utils/auth";
import { validateWeek, validateYear } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const year = validateYear(query.year, "year", { required: true });
  const week = validateWeek(query.week, "week", { required: true, year });

  // Reasons stay with planners.
  const includeReason = getSessionUser(event) !== null;
  return AbsenceService.listForWeek(year, week, includeReason);
});
