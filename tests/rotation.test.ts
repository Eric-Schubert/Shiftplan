import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestDatabase,
  insertTestData,
} from "./setup";

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

      // Week 1: Staff 1 to Shift 1
      db.prepare(
        "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
      ).run(1, 1, 1);

      // Week 1: Staff 2 to Shift 2
      db.prepare(
        "INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (?, ?, ?)"
      ).run(1, 2, 2);

      // Week 2: Staff 1 to Shift 2
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
    it("should calculate correct pattern week", () => {
      // Formel: ((calendarWeek - startWeek) % cycleLength) + 1
      // Mit: startWeek = 1, cycleLength = 4

      const startWeek = 1;
      const cycleLength = 4;

      // KW 1 -> Pattern Week 1
      expect(((1 - startWeek) % cycleLength) + 1).toBe(1);

      // KW 2 -> Pattern Week 2
      expect(((2 - startWeek) % cycleLength) + 1).toBe(2);

      // KW 4 -> Pattern Week 4
      expect(((4 - startWeek) % cycleLength) + 1).toBe(4);

      // KW 5 -> Pattern Week 1 (Zyklus wiederholt sich)
      expect(((5 - startWeek) % cycleLength) + 1).toBe(1);

      // KW 9 -> Pattern Week 1
      expect(((9 - startWeek) % cycleLength) + 1).toBe(1);
    });
  });
});
