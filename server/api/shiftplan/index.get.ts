import { ShiftplanService } from "~/server/services/shiftplan.service";

export default defineEventHandler((event) => {
  const query = getQuery(event);

  const year = Number(query.year) || new Date().getFullYear();
  const week = Number(query.week) || getISOWeek(new Date());

  return ShiftplanService.getWeeklyPlan(year, week);
});

// Hilfsfunktion: ISO Kalenderwoche berechnen
function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
