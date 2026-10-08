import type { GenerationPreviewWeek } from "~/types/shiftplan";
import { getDatabase } from "~/server/utils/database";
import { RotationService } from "~/server/services/rotation.service";
import { datesOfISOWeek } from "~/server/utils/iso-week";

export function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getISOWeeksInYear(year: number): number {
  const d = new Date(year, 11, 31);
  const week = getISOWeek(d);
  return week === 1 ? 52 : week;
}

export function listWeeks(startYear: number, startWeek: number, numberOfWeeks: number): Array<{ year: number; week: number }> {
  const weeks: Array<{ year: number; week: number }> = [];
  let year = startYear;
  let week = startWeek;

  for (let i = 0; i < numberOfWeeks; i++) {
    weeks.push({ year, week });
    week++;
    if (week > getISOWeeksInYear(year)) {
      year++;
      week = 1;
    }
  }

  return weeks;
}

/**
 * What a rollout would touch, week by week, without changing anything. Used by the
 * planner to show which weeks are already planned before it overwrites them.
 */
export function previewGeneration(startYear: number, startWeek: number, numberOfWeeks: number): GenerationPreviewWeek[] {
  const db = getDatabase();
  const countAssignments = db.prepare(`
    SELECT COUNT(*) AS count FROM shift_assignments sa
    JOIN weeks w ON w.week_id = sa.week_id
    WHERE w.year = ? AND w.week_number = ?
  `);
  const countDayChanges = db.prepare(
    "SELECT COUNT(*) AS count FROM shift_day_changes WHERE change_date BETWEEN ? AND ?"
  );

  return listWeeks(startYear, startWeek, numberOfWeeks).map(({ year, week }) => {
    const dates = datesOfISOWeek(year, week);
    return {
      year,
      week,
      pattern_week: RotationService.calculatePatternWeek(year, week),
      existing_assignments: (countAssignments.get(year, week) as { count: number }).count,
      day_changes: (countDayChanges.get(dates[0], dates[6]) as { count: number }).count,
    };
  });
}
