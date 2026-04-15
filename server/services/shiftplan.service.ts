import type { Week, ShiftWithStaff, WeeklyShiftplan } from "~/types/shiftplan";
import type { Staff } from "~/types/staff";
import { getDatabase } from "~/server/utils/database";
import { ShiftService } from "./shift.service";
import { RotationService } from "./rotation.service";

export const ShiftplanService = {
  /**
   * Holt oder erstellt eine Woche
   */
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

  /**
   * Holt eine Woche ohne sie anzulegen.
   */
  getWeek(year: number, weekNumber: number): Week | null {
    const db = getDatabase();
    const week = db
      .prepare("SELECT * FROM weeks WHERE year = ? AND week_number = ?")
      .get(year, weekNumber) as Week | undefined;

    return week || null;
  },

  /**
   * Holt den Schichtplan für eine bestimmte Woche
   */
  getWeeklyPlan(year: number, weekNumber: number): WeeklyShiftplan & { pattern_week: number } {
    const db = getDatabase();
    const week = this.getOrCreateWeek(year, weekNumber);
    const shifts = ShiftService.getActive();

    // Berechne welche Musterwoche das ist
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

  /**
   * Holt den Schichtplan read-only, ohne fehlende Wochen anzulegen.
   */
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

  /**
   * Weist einen Mitarbeiter einer Schicht zu
   */
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

  /**
   * Entfernt einen Mitarbeiter von einer Schicht
   */
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

  /**
   * Generiert automatisch einen Schichtplan basierend auf dem Rotationsmuster
   */
  generateFromPattern(year: number, weekNumber: number): WeeklyShiftplan & { pattern_week: number } {
    const db = getDatabase();
    const week = this.getOrCreateWeek(year, weekNumber);

    // Berechne welche Musterwoche gilt
    const patternWeek = RotationService.calculatePatternWeek(year, weekNumber);

    // Hole das Muster für diese Woche
    const patternData = RotationService.getPatternForWeek(patternWeek);

    // Lösche existierende Zuweisungen für diese Woche
    db.prepare("DELETE FROM shift_assignments WHERE week_id = ?").run(week.week_id);

    // Wende das Muster an
    for (const assignment of patternData.assignments) {
      for (const staff of assignment.staff) {
        this.assignStaff(staff.staff_id, assignment.shift.shift_id, week.week_id);
      }
    }

    return this.getWeeklyPlan(year, weekNumber);
  },

  /**
   * Generiert Schichtpläne für mehrere Wochen basierend auf dem Rotationsmuster
   */
  generateMultipleWeeks(
    startYear: number,
    startWeek: number,
    numberOfWeeks: number
  ): { generated: number; weeks: Array<{ year: number; week: number; pattern_week: number }> } {
    const generatedWeeks: Array<{ year: number; week: number; pattern_week: number }> = [];

    let currentYear = startYear;
    let currentWeek = startWeek;

    for (let i = 0; i < numberOfWeeks; i++) {
      const result = this.generateFromPattern(currentYear, currentWeek);
      generatedWeeks.push({
        year: currentYear,
        week: currentWeek,
        pattern_week: result.pattern_week,
      });

      // Nächste Woche
      currentWeek++;
      const maxWeeks = this.getISOWeeksInYear(currentYear);
      if (currentWeek > maxWeeks) {
        currentYear++;
        currentWeek = 1;
      }
    }

    return {
      generated: generatedWeeks.length,
      weeks: generatedWeeks,
    };
  },

  /**
   * Hilfsfunktion: Anzahl der ISO-Wochen in einem Jahr
   */
  getISOWeeksInYear(year: number): number {
    const d = new Date(year, 11, 31);
    const week = this.getISOWeek(d);
    return week === 1 ? 52 : week;
  },

  /**
   * Hilfsfunktion: ISO Kalenderwoche berechnen
   */
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
