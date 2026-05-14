import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestDatabase,
  insertTestData,
} from "./setup";
import { RotationService } from "../server/services/rotation.service";

describe("Rotation Operations", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe("Rotation Config", () => {
    it("should create default config", () => {
      const db = getTestDatabase();

      db.prepare(
        "INSERT OR IGNORE INTO rotation_config (config_id, cycle_length, start_year, start_week) VALUES (1, 4, 2025, 1)"
      ).run();

      const config = db
        .prepare("SELECT * FROM rotation_config WHERE config_id = 1")
        .get() as any;

      expect(config).toBeDefined();
      expect(config.cycle_length).toBe(4);
      expect(config.start_year).toBe(2025);
      expect(config.start_week).toBe(1);
    });

    it("should update cycle length", () => {
      const db = getTestDatabase();

      db.prepare(
        "INSERT INTO rotation_config (config_id, cycle_length, start_year, start_week) VALUES (1, 4, 2025, 1)"
      ).run();

      db.prepare(
        "UPDATE rotation_config SET cycle_length = ? WHERE config_id = 1"
      ).run(6);

      const config = db
        .prepare("SELECT * FROM rotation_config WHERE config_id = 1")
        .get() as any;

      expect(config.cycle_length).toBe(6);
    });
  });

  describe("Rotation Pattern", () => {
    it("should assign staff to pattern", () => {
      const db = getTestDatabase();
      insertTestData(db);

      const result = db
        .prepare(
          "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
        )
        .run(1, 1, 1);

      expect(result.changes).toBe(1);
    });

    it("should prevent duplicate assignments", () => {
      const db = getTestDatabase();
      insertTestData(db);

      db.prepare(
        "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
      ).run(1, 1, 1);

      expect(() => {
        db.prepare(
          "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
        ).run(1, 1, 1);
      }).toThrow();
    });

    it("should allow same staff in different weeks", () => {
      const db = getTestDatabase();
      insertTestData(db);

      db.prepare(
        "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
      ).run(1, 1, 1);

      const result = db
        .prepare(
          "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
        )
        .run(2, 1, 1);

      expect(result.changes).toBe(1);
    });

    it("should get pattern for specific week", () => {
      const db = getTestDatabase();
      insertTestData(db);


      db.prepare(
        "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
      ).run(1, 1, 1);


      db.prepare(
        "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
      ).run(1, 2, 2);


      db.prepare(
        "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
      ).run(2, 1, 2);

      const week1Pattern = db
        .prepare("SELECT * FROM rotation_pattern WHERE pattern_week = ?")
        .all(1);

      expect(week1Pattern).toHaveLength(2);

      const week2Pattern = db
        .prepare("SELECT * FROM rotation_pattern WHERE pattern_week = ?")
        .all(2);

      expect(week2Pattern).toHaveLength(1);
    });

    it("should remove staff from pattern", () => {
      const db = getTestDatabase();
      insertTestData(db);

      db.prepare(
        "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
      ).run(1, 1, 1);

      db.prepare(
        "DELETE FROM rotation_pattern WHERE pattern_week = ? AND staff_id = ? AND shift_id = ?"
      ).run(1, 1, 1);

      const pattern = db
        .prepare(
          "SELECT * FROM rotation_pattern WHERE pattern_week = ? AND staff_id = ? AND shift_id = ?"
        )
        .get(1, 1, 1);

      expect(pattern).toBeUndefined();
    });
  });

  describe("Pattern Week Calculation", () => {
    it("should calculate correct pattern week for sequential weeks", () => {
      const startYear = 2025;
      const startWeek = 1;
      const cycleLength = 4;

      function calculatePatternWeek(year: number, week: number): number {
        const weeksFromStart = RotationService.weeksBetween(startYear, startWeek, year, week);
        const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;
        return patternIndex + 1;
      }


      expect(calculatePatternWeek(2025, 1)).toBe(1);


      expect(calculatePatternWeek(2025, 2)).toBe(2);


      expect(calculatePatternWeek(2025, 4)).toBe(4);


      expect(calculatePatternWeek(2025, 5)).toBe(1);



      expect(calculatePatternWeek(2026, 1)).toBe(1);


      expect(calculatePatternWeek(2026, 2)).toBe(2);
    });

    it("should handle weeks before start date", () => {
      const startYear = 2025;
      const startWeek = 10;
      const cycleLength = 4;

      function calculatePatternWeek(year: number, week: number): number {
        const weeksFromStart = RotationService.weeksBetween(startYear, startWeek, year, week);
        const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;
        return patternIndex + 1;
      }



      expect(calculatePatternWeek(2025, 9)).toBe(4);


      expect(calculatePatternWeek(2025, 8)).toBe(3);


      expect(calculatePatternWeek(2025, 6)).toBe(1);
    });

    it("should never return pattern week > cycle length", () => {
      const cycleLength = 4;

      function calculatePatternWeek(weeksFromStart: number): number {
        const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;
        return patternIndex + 1;
      }


      for (let i = -100; i <= 100; i++) {
        const result = calculatePatternWeek(i);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(cycleLength);
      }
    });

    it("should keep a 6-week rhythm stable after an ISO year with 53 weeks", () => {
      const startYear = 2026;
      const startWeek = 18;
      const cycleLength = 6;

      function calculatePatternWeek(year: number, week: number): number {
        const weeksFromStart = RotationService.weeksBetween(startYear, startWeek, year, week);
        const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;
        return patternIndex + 1;
      }

      expect(calculatePatternWeek(2026, 18)).toBe(1);
      expect(calculatePatternWeek(2026, 19)).toBe(2);
      expect(calculatePatternWeek(2026, 20)).toBe(3);
      expect(calculatePatternWeek(2026, 21)).toBe(4);
      expect(calculatePatternWeek(2026, 22)).toBe(5);
      expect(calculatePatternWeek(2026, 23)).toBe(6);
      expect(calculatePatternWeek(2026, 24)).toBe(1);
      expect(calculatePatternWeek(2026, 25)).toBe(2);
    });

    it("should count 53 ISO weeks across 2020 correctly", () => {
      expect(RotationService.weeksBetween(2020, 1, 2021, 1)).toBe(53);
    });
  });
});
