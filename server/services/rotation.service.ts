import type {
  RotationConfig,
  RotationPatternEntry,
  PatternWeekData,
  FullRotationPattern,
  RotationConfigUpdateDTO,
} from "~/types/rotation";
import type { Staff } from "~/types/staff";
import type { Shift } from "~/types/shift";
import { getDatabase } from "~/server/utils/database";
import { getRotationDefaults } from "~/server/config/domain-config";

export const RotationService = {






  getConfig(): RotationConfig {
    const db = getDatabase();
    let config = db
      .prepare("SELECT * FROM rotation_config LIMIT 1")
      .get() as RotationConfig | undefined;


    if (!config) {
      const currentYear = new Date().getFullYear();
      const defaults = getRotationDefaults();
      const result = db
        .prepare(
          "INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (?, ?, ?)"
        )
        .run(defaults.cycleLength, currentYear, defaults.startWeek);
      config = {
        config_id: result.lastInsertRowid as number,
        cycle_length: defaults.cycleLength,
        start_year: currentYear,
        start_week: defaults.startWeek,
      };
    }

    return config;
  },




  updateConfig(data: RotationConfigUpdateDTO): RotationConfig {
    const db = getDatabase();
    const current = this.getConfig();

    db.prepare(`
      UPDATE rotation_config
      SET cycle_length = ?, start_year = ?, start_week = ?
      WHERE config_id = ?
    `).run(
      data.cycle_length ?? current.cycle_length,
      data.start_year ?? current.start_year,
      data.start_week ?? current.start_week,
      current.config_id
    );

    return this.getConfig();
  },







  getAllPatternEntries(): RotationPatternEntry[] {
    const db = getDatabase();
    return db
      .prepare("SELECT * FROM rotation_pattern ORDER BY pattern_week, shift_id")
      .all() as RotationPatternEntry[];
  },




  getFullPattern(): FullRotationPattern {
    const db = getDatabase();
    const config = this.getConfig();


    const shifts = db
      .prepare("SELECT * FROM shifts WHERE active = 1 ORDER BY sort_order")
      .all() as Shift[];


    const weeks: PatternWeekData[] = [];

    for (let week = 1; week <= config.cycle_length; week++) {
      const assignments = shifts.map((shift) => {

        const staff = db
          .prepare(`
            SELECT s.* FROM staff s
            JOIN rotation_pattern rp ON s.staff_id = rp.staff_id
            WHERE rp.pattern_week = ? AND rp.shift_id = ? AND s.active = 1
            ORDER BY s.name
          `)
          .all(week, shift.shift_id) as Staff[];

        return { shift, staff };
      });

      weeks.push({ pattern_week: week, assignments });
    }

    return { config, weeks };
  },




  assignToPattern(
    patternWeek: number,
    staffId: number,
    shiftId: number
  ): boolean {
    const db = getDatabase();
    const config = this.getConfig();


    if (patternWeek < 1 || patternWeek > config.cycle_length) {
      return false;
    }

    try {
      db.prepare(`
        INSERT OR IGNORE INTO rotation_pattern (pattern_week, staff_id, shift_id)
        VALUES (?, ?, ?)
      `).run(patternWeek, staffId, shiftId);
      return true;
    } catch {
      return false;
    }
  },




  unassignFromPattern(
    patternWeek: number,
    staffId: number,
    shiftId: number
  ): boolean {
    const db = getDatabase();
    const result = db
      .prepare(`
        DELETE FROM rotation_pattern
        WHERE pattern_week = ? AND staff_id = ? AND shift_id = ?
      `)
      .run(patternWeek, staffId, shiftId);
    return result.changes > 0;
  },




  clearPatternWeek(patternWeek: number): boolean {
    const db = getDatabase();
    db.prepare("DELETE FROM rotation_pattern WHERE pattern_week = ?").run(
      patternWeek
    );
    return true;
  },




  clearAllPatterns(): boolean {
    const db = getDatabase();
    db.prepare("DELETE FROM rotation_pattern").run();
    return true;
  },




  replacePattern(
    config: Omit<RotationConfig, "config_id">,
    entries: Array<{ pattern_week: number; staff_id: number; shift_id: number }>
  ): FullRotationPattern {
    const db = getDatabase();
    const current = this.getConfig();

    const replaceTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE rotation_config
        SET cycle_length = ?, start_year = ?, start_week = ?
        WHERE config_id = ?
      `).run(config.cycle_length, config.start_year, config.start_week, current.config_id);

      db.prepare("DELETE FROM rotation_pattern").run();

      const insertPattern = db.prepare(`
        INSERT OR IGNORE INTO rotation_pattern (pattern_week, staff_id, shift_id)
        VALUES (?, ?, ?)
      `);

      for (const entry of entries) {
        insertPattern.run(entry.pattern_week, entry.staff_id, entry.shift_id);
      }
    });

    replaceTransaction();
    return this.getFullPattern();
  },







  calculatePatternWeek(year: number, weekNumber: number): number {
    const config = this.getConfig();


    const weeksFromStart = this.weeksBetween(
      config.start_year,
      config.start_week,
      year,
      weekNumber
    );



    const patternIndex = ((weeksFromStart % config.cycle_length) + config.cycle_length) % config.cycle_length;


    return patternIndex + 1;
  },




  weeksBetween(
    startYear: number,
    startWeek: number,
    endYear: number,
    endWeek: number
  ): number {
    const startDate = this.getISOWeekStartDate(startYear, startWeek);
    const endDate = this.getISOWeekStartDate(endYear, endWeek);
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

    return Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerWeek);
  },




  getISOWeekStartDate(year: number, week: number): Date {
    const januaryFourth = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = januaryFourth.getUTCDay() || 7;
    const firstIsoWeekMonday = new Date(januaryFourth);

    firstIsoWeekMonday.setUTCDate(januaryFourth.getUTCDate() - dayOfWeek + 1);
    firstIsoWeekMonday.setUTCDate(firstIsoWeekMonday.getUTCDate() + (week - 1) * 7);

    return firstIsoWeekMonday;
  },




  getPatternForWeek(patternWeek: number): PatternWeekData {
    const db = getDatabase();

    const shifts = db
      .prepare("SELECT * FROM shifts WHERE active = 1 ORDER BY sort_order")
      .all() as Shift[];

    const assignments = shifts.map((shift) => {
      const staff = db
        .prepare(`
          SELECT s.* FROM staff s
          JOIN rotation_pattern rp ON s.staff_id = rp.staff_id
          WHERE rp.pattern_week = ? AND rp.shift_id = ? AND s.active = 1
          ORDER BY s.name
        `)
        .all(patternWeek, shift.shift_id) as Staff[];

      return { shift, staff };
    });

    return { pattern_week: patternWeek, assignments };
  },
};
