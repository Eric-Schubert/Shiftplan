import type {
  GenerationPreviewWeek,
  GenerationResult,
  Week,
  ShiftWithStaff,
  WeeklyShiftplan,
} from "~/types/shiftplan";
import type { Staff } from "~/types/staff";
import { getDatabase } from "~/server/utils/database";
import { ShiftService } from "./shift.service";
import { RotationService } from "./rotation.service";
import { datesOfISOWeek } from "~/server/utils/iso-week";

export const ShiftplanService = {



  getOrCreateWeek(year: number, weekNumber: number): Week {
    const db = getDatabase();

    let week = db
      .prepare("SELECT * FROM weeks WHERE year = ? AND week_number = ?")
      .get(year, weekNumber) as Week | undefined;

    if (!week) {
      const result = db
        .prepare("INSERT INTO weeks (year, week_number) VALUES (?, ?)")
        .run(year, weekNumber);
      week = {
        week_id: result.lastInsertRowid as number,
        year,
        week_number: weekNumber,
      };
    }

    return week;
  },




  getWeek(year: number, weekNumber: number): Week | null {
    const db = getDatabase();
    const week = db
      .prepare("SELECT * FROM weeks WHERE year = ? AND week_number = ?")
      .get(year, weekNumber) as Week | undefined;

    return week || null;
  },




  getWeeklyPlan(year: number, weekNumber: number): WeeklyShiftplan & { pattern_week: number } {
    const db = getDatabase();
    const week = this.getOrCreateWeek(year, weekNumber);
    const shifts = ShiftService.getActive();


    const patternWeek = RotationService.calculatePatternWeek(year, weekNumber);

    const shiftsWithStaff: ShiftWithStaff[] = shifts.map((shift) => {
      const assignments = db
        .prepare(`
          SELECT s.* FROM staff s
          JOIN shift_assignments sa ON s.staff_id = sa.staff_id
          WHERE sa.shift_id = ? AND sa.week_id = ?
        `)
        .all(shift.shift_id, week.week_id) as Staff[];

      return {
        ...shift,
        assigned_staff: assignments,
      };
    });

    return {
      week,
      shifts: shiftsWithStaff,
      pattern_week: patternWeek,
    };
  },




  getWeeklyPlanReadOnly(year: number, weekNumber: number): WeeklyShiftplan & { pattern_week: number } {
    const db = getDatabase();
    const existingWeek = this.getWeek(year, weekNumber);
    const week: Week = existingWeek || {
      week_id: 0,
      year,
      week_number: weekNumber,
    };
    const shifts = ShiftService.getActive();
    const patternWeek = RotationService.calculatePatternWeek(year, weekNumber);

    const shiftsWithStaff: ShiftWithStaff[] = shifts.map((shift) => {
      const assignments = existingWeek
        ? db
            .prepare(`
              SELECT s.* FROM staff s
              JOIN shift_assignments sa ON s.staff_id = sa.staff_id
              WHERE sa.shift_id = ? AND sa.week_id = ?
            `)
            .all(shift.shift_id, existingWeek.week_id) as Staff[]
        : [];

      return {
        ...shift,
        assigned_staff: assignments,
      };
    });

    return {
      week,
      shifts: shiftsWithStaff,
      pattern_week: patternWeek,
    };
  },




  hasAssignment(staffId: number, shiftId: number, weekId: number): boolean {
    const db = getDatabase();
    const assignment = db
      .prepare(`
        SELECT assignment_id FROM shift_assignments
        WHERE staff_id = ? AND shift_id = ? AND week_id = ?
      `)
      .get(staffId, shiftId, weekId);

    return Boolean(assignment);
  },




  assignStaff(staffId: number, shiftId: number, weekId: number): boolean {
    const db = getDatabase();
    try {
      db.prepare(`
        INSERT OR IGNORE INTO shift_assignments (staff_id, shift_id, week_id)
        VALUES (?, ?, ?)
      `).run(staffId, shiftId, weekId);
      return true;
    } catch {
      return false;
    }
  },




  unassignStaff(staffId: number, shiftId: number, weekId: number): boolean {
    const db = getDatabase();
    const result = db
      .prepare(`
        DELETE FROM shift_assignments
        WHERE staff_id = ? AND shift_id = ? AND week_id = ?
      `)
      .run(staffId, shiftId, weekId);
    return result.changes > 0;
  },




  generateFromPattern(year: number, weekNumber: number): WeeklyShiftplan & { pattern_week: number } {
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




  /**
   * What a rollout would touch, week by week, without changing anything. Used by the
   * planner to show which weeks are already planned before it overwrites them.
   */
  previewGeneration(startYear: number, startWeek: number, numberOfWeeks: number): GenerationPreviewWeek[] {
    const db = getDatabase();
    const countAssignments = db.prepare(`
      SELECT COUNT(*) AS count FROM shift_assignments sa
      JOIN weeks w ON w.week_id = sa.week_id
      WHERE w.year = ? AND w.week_number = ?
    `);
    const countDayChanges = db.prepare(
      "SELECT COUNT(*) AS count FROM shift_day_changes WHERE change_date BETWEEN ? AND ?"
    );

    return this.listWeeks(startYear, startWeek, numberOfWeeks).map(({ year, week }) => {
      const dates = datesOfISOWeek(year, week);
      return {
        year,
        week,
        pattern_week: RotationService.calculatePatternWeek(year, week),
        existing_assignments: (countAssignments.get(year, week) as { count: number }).count,
        day_changes: (countDayChanges.get(dates[0], dates[6]) as { count: number }).count,
      };
    });
  },

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

  listWeeks(startYear: number, startWeek: number, numberOfWeeks: number): Array<{ year: number; week: number }> {
    const weeks: Array<{ year: number; week: number }> = [];
    let year = startYear;
    let week = startWeek;

    for (let i = 0; i < numberOfWeeks; i++) {
      weeks.push({ year, week });
      week++;
      if (week > this.getISOWeeksInYear(year)) {
        year++;
        week = 1;
      }
    }

    return weeks;
  },




  getISOWeeksInYear(year: number): number {
    const d = new Date(year, 11, 31);
    const week = this.getISOWeek(d);
    return week === 1 ? 52 : week;
  },




  getISOWeek(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  },
};
