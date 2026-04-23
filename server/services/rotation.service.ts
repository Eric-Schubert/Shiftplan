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

export const RotationService = {
  // ============================================
  // KONFIGURATION
  // ============================================

  /**
   * Holt die aktuelle Rotationskonfiguration
   */
  getConfig(): RotationConfig {
    const db = getDatabase();
    let config = db
      .prepare("SELECT * FROM rotation_config LIMIT 1")
      .get() as RotationConfig | undefined;

    // Falls keine Konfiguration existiert, erstelle eine Standard-Konfiguration
    if (!config) {
      const currentYear = new Date().getFullYear();
      const result = db
        .prepare(
          "INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (?, ?, ?)"
        )
        .run(4, currentYear, 1);
      config = {
        config_id: result.lastInsertRowid as number,
        cycle_length: 4,
        start_year: currentYear,
        start_week: 1,
      };
    }

    return config;
  },

  /**
   * Aktualisiert die Rotationskonfiguration
   */
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

  // ============================================
  // MUSTERVERWALTUNG
  // ============================================

  /**
   * Holt alle Pattern-Einträge
   */
  getAllPatternEntries(): RotationPatternEntry[] {
    const db = getDatabase();
    return db
      .prepare("SELECT * FROM rotation_pattern ORDER BY pattern_week, shift_id")
      .all() as RotationPatternEntry[];
  },

  /**
   * Holt das komplette Rotationsmuster mit allen Details
   */
  getFullPattern(): FullRotationPattern {
    const db = getDatabase();
    const config = this.getConfig();

    // Hole alle aktiven Schichten
    const shifts = db
      .prepare("SELECT * FROM shifts WHERE active = 1 ORDER BY sort_order")
      .all() as Shift[];

    // Baue das Muster für jede Woche im Zyklus
    const weeks: PatternWeekData[] = [];

    for (let week = 1; week <= config.cycle_length; week++) {
      const assignments = shifts.map((shift) => {
        // Hole alle Mitarbeiter die in dieser Musterwoche dieser Schicht zugewiesen sind
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

  /**
   * Weist einen Mitarbeiter einer Schicht in einer Musterwoche zu
   */
  assignToPattern(
    patternWeek: number,
    staffId: number,
    shiftId: number
  ): boolean {
    const db = getDatabase();
    const config = this.getConfig();

    // Validiere die Musterwoche
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

  /**
   * Entfernt einen Mitarbeiter aus einer Schicht in einer Musterwoche
   */
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

  /**
   * Löscht alle Pattern-Einträge für eine bestimmte Musterwoche
   */
  clearPatternWeek(patternWeek: number): boolean {
    const db = getDatabase();
    db.prepare("DELETE FROM rotation_pattern WHERE pattern_week = ?").run(
      patternWeek
    );
    return true;
  },

  /**
   * Löscht das gesamte Pattern
   */
  clearAllPatterns(): boolean {
    const db = getDatabase();
    db.prepare("DELETE FROM rotation_pattern").run();
    return true;
  },

  /**
   * Ersetzt Konfiguration und Rotationsmuster in einem Schritt.
   * Wird vom Excel-Import genutzt, damit nie ein halb importiertes Muster bleibt.
   */
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

  // ============================================
  // BERECHNUNGEN
  // ============================================

  /**
   * Berechnet welche Musterwoche für eine gegebene Kalenderwoche gilt
   */
  calculatePatternWeek(year: number, weekNumber: number): number {
    const config = this.getConfig();

    // Berechne die Anzahl der Wochen seit dem Startpunkt
    const weeksFromStart = this.weeksBetween(
      config.start_year,
      config.start_week,
      year,
      weekNumber
    );

    // Robuste Modulo-Berechnung die immer positiv ist
    // ((n % m) + m) % m garantiert ein positives Ergebnis
    const patternIndex = ((weeksFromStart % config.cycle_length) + config.cycle_length) % config.cycle_length;
    
    // +1 weil Musterwochen 1-basiert sind (1, 2, 3, 4 statt 0, 1, 2, 3)
    return patternIndex + 1;
  },

  /**
   * Hilfsfunktion: Berechnet die Anzahl der Wochen zwischen zwei Kalenderwochen
   */
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

  /**
   * Hilfsfunktion: Liefert den Montag einer ISO-Kalenderwoche in UTC.
   * So bleibt die Rotationslogik auch bei ISO-Jahren mit 53 Wochen stabil.
   */
  getISOWeekStartDate(year: number, week: number): Date {
    const januaryFourth = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = januaryFourth.getUTCDay() || 7;
    const firstIsoWeekMonday = new Date(januaryFourth);

    firstIsoWeekMonday.setUTCDate(januaryFourth.getUTCDate() - dayOfWeek + 1);
    firstIsoWeekMonday.setUTCDate(firstIsoWeekMonday.getUTCDate() + (week - 1) * 7);

    return firstIsoWeekMonday;
  },

  /**
   * Holt das Pattern für eine spezifische Musterwoche
   */
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
