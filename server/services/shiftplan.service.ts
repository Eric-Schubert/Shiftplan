import type { GenerationResult } from "~/types/shiftplan";
import { getDatabase } from "~/server/utils/database";
import { RotationService } from "~/server/services/rotation.service";
import {
  assignStaff,
  getOrCreateWeek,
  getWeek,
  hasAssignment,
  unassignStaff,
} from "~/server/services/shiftplan/weeks";
import {
  getWeeklyPlan,
  getWeeklyPlanReadOnly,
  type PlanWithPatternWeek,
} from "~/server/services/shiftplan/weekly-plan";
import {
  getISOWeek,
  getISOWeeksInYear,
  listWeeks,
  previewGeneration,
} from "~/server/services/shiftplan/generation";

// The generation workflows call siblings through `this`, so tests can swap single steps.
export const ShiftplanService = {
  getOrCreateWeek,
  getWeek,
  getWeeklyPlan,
  getWeeklyPlanReadOnly,
  hasAssignment,
  assignStaff,
  unassignStaff,

  generateFromPattern(year: number, weekNumber: number): PlanWithPatternWeek {
    const db = getDatabase();
    const week = this.getOrCreateWeek(year, weekNumber);
    const patternWeek = RotationService.calculatePatternWeek(year, weekNumber);
    const patternData = RotationService.getPatternForWeek(patternWeek);

    db.prepare("DELETE FROM shift_assignments WHERE week_id = ?").run(week.week_id);

    for (const assignment of patternData.assignments) {
      for (const staff of assignment.staff) {
        this.assignStaff(staff.staff_id, assignment.shift.shift_id, week.week_id);
      }
    }

    return this.getWeeklyPlan(year, weekNumber);
  },

  previewGeneration,

  /**
   * Fills several weeks from the rotation pattern in one transaction. Weeks that are
   * already planned are skipped unless overwrite is set.
   */
  generateMultipleWeeks(
    startYear: number,
    startWeek: number,
    numberOfWeeks: number,
    options: { overwrite?: boolean } = {}
  ): GenerationResult {
    const db = getDatabase();
    const overwrite = options.overwrite ?? true;
    const result: GenerationResult = { generated: 0, skipped: 0, overwritten: 0, weeks: [] };

    db.transaction(() => {
      for (const preview of this.previewGeneration(startYear, startWeek, numberOfWeeks)) {
        const { year, week, pattern_week } = preview;

        if (preview.existing_assignments > 0 && !overwrite) {
          result.skipped++;
          result.weeks.push({ year, week, pattern_week, status: "skipped" });
          continue;
        }

        this.generateFromPattern(year, week);
        result.generated++;
        if (preview.existing_assignments > 0) result.overwritten++;
        result.weeks.push({
          year,
          week,
          pattern_week,
          status: preview.existing_assignments > 0 ? "overwritten" : "generated",
        });
      }
    })();

    return result;
  },

  listWeeks,
  getISOWeeksInYear,
  getISOWeek,
};
