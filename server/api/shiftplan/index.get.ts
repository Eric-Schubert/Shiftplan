import { ShiftplanService } from "~/server/services/shiftplan.service";
import { validateYear, validateWeek } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const year = validateYear(query.year, "Jahr") || new Date().getFullYear();
  const week = validateWeek(query.week, "Woche") || getISOWeek(new Date());
  return ShiftplanService.getWeeklyPlanReadOnly(year, week);
});

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
