import { DayChangeService } from "~/server/services/day-change.service";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { planningWeek } from "~/server/utils/planning-date";
import { validateYear, validateWeek } from "~/server/utils/validation";
import { isoWeeksInYear } from "~/shared/utils/week";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  // Without parameters: this week in the planning time zone, year and week taken together.
  const current = planningWeek();
  const year = validateYear(query.year, "year") ?? current.year;
  const week = validateWeek(query.week, "week", { year }) ?? Math.min(current.week, isoWeeksInYear(year));
  return {
    ...ShiftplanService.getWeeklyPlanReadOnly(year, week),
    day_changes: DayChangeService.listForWeek(year, week),
  };
});
