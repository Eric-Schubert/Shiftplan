import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestDatabase,
  insertTestData,
} from "./setup";

describe("Shiftplan Operations", () => {
  beforeEach(() => {
    setupTestDatabase();
    insertTestData(getTestDatabase());
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe("Week Management", () => {
    it("should create a new week", () => {
      const db = getTestDatabase();

      const result = db.prepare("INSERT INTO weeks (year, week_number) VALUES (?, ?)").run(2025, 1);

      expect(result.changes).toBe(1);
    });

    it("should prevent duplicate weeks", () => {
      const db = getTestDatabase();

      db.prepare("INSERT INTO weeks (year, week_number) VALUES (?, ?)").run(2025, 1);

      expect(() => {
        db.prepare("INSERT INTO weeks (year, week_number) VALUES (?, ?)").run(2025, 1);
      }).toThrow();
    });

    it("should get or create week", () => {
      const db = getTestDatabase();

      db.prepare("INSERT OR IGNORE INTO weeks (year, week_number) VALUES (?, ?)").run(2025, 5);

      const week = db.prepare("SELECT * FROM weeks WHERE year = ? AND week_number = ?").get(2025, 5) as any;

      expect(week).toBeDefined();
      expect(week.year).toBe(2025);
      expect(week.week_number).toBe(5);
    });
  });

  describe("Weekly Plan Query", () => {
    it("should get complete weekly plan with staff names", () => {
      const db = getTestDatabase();

      const { lastInsertRowid: weekId } = db.prepare("INSERT INTO weeks (year, week_number) VALUES (?, ?)").run(2025, 1);

      db.prepare("INSERT INTO shift_assignments (week_id, staff_id, shift_id) VALUES (?, ?, ?)").run(weekId, 1, 1);

      const plan = db
        .prepare(`
          SELECT
            s.shift_id,
            s.name as shift_name,
            st.staff_id,
            st.name as staff_name
          FROM shifts s
          LEFT JOIN shift_assignments sa ON s.shift_id = sa.shift_id AND sa.week_id = ?
          LEFT JOIN staff st ON sa.staff_id = st.staff_id
          WHERE s.active = 1
          ORDER BY s.sort_order
        `)
        .all(weekId) as any[];

      expect(plan.length).toBeGreaterThan(0);

      const fruehschicht = plan.find((p) => p.shift_name === "Frühschicht");
      expect(fruehschicht).toBeDefined();
      expect(fruehschicht.staff_name).toBe("Max Mustermann");
    });
  });
});
