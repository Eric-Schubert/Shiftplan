import { DayChangeService } from "~/server/services/day-change.service";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { StaffService } from "~/server/services/staff.service";
import { getSessionUser } from "~/server/utils/auth";
import { planningWeek } from "~/server/utils/planning-date";
import { validateYear, validateWeek } from "~/server/utils/validation";
import { isoWeeksInYear } from "~/shared/utils/week";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  // Without parameters: this week in the planning time zone, year and week taken together.
  const current = planningWeek();
  const year = validateYear(query.year, "year") ?? current.year;
  const week = validateWeek(query.week, "week", { year }) ?? Math.min(current.week, isoWeeksInYear(year));
  const plan = ShiftplanService.getWeeklyPlanReadOnly(year, week);
  const dayChanges = DayChangeService.listForWeek(year, week);
  if (getSessionUser(event)) return { ...plan, day_changes: dayChanges };

  // The team sees names, not the short codes of the PIN sign-in or which planner made a change.
  return {
    ...plan,
    shifts: plan.shifts.map((shift) => ({ ...shift, assigned_staff: shift.assigned_staff.map((staff) => StaffService.publicFields(staff)) })),
    day_changes: dayChanges.map(({ created_by: _createdBy, ...change }) => change),
  };
});
