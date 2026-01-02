import type { Week, ShiftWithStaff, WeeklyShiftplan } from "~/types/shiftplan";
import type { Staff } from "~/types/staff";
import { getDatabase } from "~/server/utils/database";
import { ShiftService } from "./shift.service";
import { StaffService } from "./staff.service";

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
   * Holt den Schichtplan für eine bestimmte Woche
   */
  getWeeklyPlan(year: number, weekNumber: number): WeeklyShiftplan {
    const db = getDatabase();
    const week = this.getOrCreateWeek(year, weekNumber);
    const shifts = ShiftService.getActive();

    const shiftsWithStaff: ShiftWithStaff[] = shifts.map((shift) => {
      const assignments = db
        .prepare(
          `
        SELECT s.* FROM staff s
        JOIN shift_assignments sa ON s.staff_id = sa.staff_id
        WHERE sa.shift_id = ? AND sa.week_id = ?
      `
        )
        .all(shift.shift_id, week.week_id) as Staff[];

      return {
        ...shift,
        assigned_staff: assignments,
      };
    });

    return {
      week,
      shifts: shiftsWithStaff,
    };
  },

  /**
   * Weist einen Mitarbeiter einer Schicht zu
   */
  assignStaff(
    staffId: number,
    shiftId: number,
    weekId: number
  ): boolean {
    const db = getDatabase();
    try {
      db.prepare(
        `
        INSERT OR IGNORE INTO shift_assignments (staff_id, shift_id, week_id)
        VALUES (?, ?, ?)
      `
      ).run(staffId, shiftId, weekId);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Entfernt einen Mitarbeiter von einer Schicht
   */
  unassignStaff(
    staffId: number,
    shiftId: number,
    weekId: number
  ): boolean {
    const db = getDatabase();
    const result = db
      .prepare(
        `
      DELETE FROM shift_assignments 
      WHERE staff_id = ? AND shift_id = ? AND week_id = ?
    `
      )
      .run(staffId, shiftId, weekId);
    return result.changes > 0;
  },

  /**
   * Generiert automatisch einen Schichtplan basierend auf Rotation
   */
  generateAutoPlan(year: number, weekNumber: number): WeeklyShiftplan {
    const db = getDatabase();
    const week = this.getOrCreateWeek(year, weekNumber);
    const shifts = ShiftService.getActive();
    const staff = StaffService.getActive();

    if (staff.length === 0 || shifts.length === 0) {
      return this.getWeeklyPlan(year, weekNumber);
    }

    // Lösche existierende Zuweisungen für diese Woche
    db.prepare("DELETE FROM shift_assignments WHERE week_id = ?").run(
      week.week_id
    );

    // Rotiere Mitarbeiter basierend auf Kalenderwoche
    const rotatedStaff = this.rotateArray(staff, weekNumber);

    // Weise Mitarbeiter den Schichten zu
    let staffIndex = 0;
    for (const shift of shifts) {
      for (let i = 0; i < shift.min_staff && staffIndex < rotatedStaff.length; i++) {
        this.assignStaff(
          rotatedStaff[staffIndex].staff_id,
          shift.shift_id,
          week.week_id
        );
        staffIndex++;
      }
    }

    return this.getWeeklyPlan(year, weekNumber);
  },

  /**
   * Rotiert ein Array um n Positionen
   */
  rotateArray<T>(arr: T[], n: number): T[] {
    if (arr.length === 0) return arr;
    const rotation = n % arr.length;
    return [...arr.slice(rotation), ...arr.slice(0, rotation)];
  },
};
