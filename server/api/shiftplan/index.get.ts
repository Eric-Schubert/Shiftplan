import { DayChangeService } from "~/server/services/day-change.service";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { validateYear, validateWeek } from "~/server/utils/validation";
import { isoWeekOfDate } from "~/shared/utils/week";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const year = validateYear(query.year, "year") || new Date().getFullYear();
  const week = validateWeek(query.week, "week") || isoWeekOfDate(new Date()).week;
  return {
    ...ShiftplanService.getWeeklyPlanReadOnly(year, week),
    day_changes: DayChangeService.listForWeek(year, week),
  };
});
