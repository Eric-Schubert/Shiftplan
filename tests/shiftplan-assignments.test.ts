import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestDatabase,
  insertTestData,
} from "./setup";

const INSERT_WEEK = "INSERT INTO weeks (year, week_number) VALUES (?, ?)";
const INSERT_ASSIGNMENT = "INSERT INTO shift_assignments (week_id, staff_id, shift_id) VALUES (?, ?, ?)";

describe("Shiftplan Operations", () => {
  beforeEach(() => {
    setupTestDatabase();
    insertTestData(getTestDatabase());
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe("Shift Assignments", () => {
    it("should assign staff to shift in week", () => {
      const db = getTestDatabase();

      const { lastInsertRowid: weekId } = db.prepare(INSERT_WEEK).run(2025, 1);
      const result = db.prepare(INSERT_ASSIGNMENT).run(weekId, 1, 1);

      expect(result.changes).toBe(1);
    });

    it("should prevent duplicate assignments in same week", () => {
      const db = getTestDatabase();

      const { lastInsertRowid: weekId } = db.prepare(INSERT_WEEK).run(2025, 1);
      db.prepare(INSERT_ASSIGNMENT).run(weekId, 1, 1);

      expect(() => {
        db.prepare(INSERT_ASSIGNMENT).run(weekId, 1, 1);
      }).toThrow();
    });

    it("should allow same staff in different shifts", () => {
      const db = getTestDatabase();

      const { lastInsertRowid: weekId } = db.prepare(INSERT_WEEK).run(2025, 1);
      db.prepare(INSERT_ASSIGNMENT).run(weekId, 1, 1);
      const result = db.prepare(INSERT_ASSIGNMENT).run(weekId, 1, 2);

      expect(result.changes).toBe(1);
    });

    it("should get all assignments for a week", () => {
      const db = getTestDatabase();

      const { lastInsertRowid: weekId } = db.prepare(INSERT_WEEK).run(2025, 1);
      db.prepare(INSERT_ASSIGNMENT).run(weekId, 1, 1);
      db.prepare(INSERT_ASSIGNMENT).run(weekId, 2, 1);
      db.prepare(INSERT_ASSIGNMENT).run(weekId, 3, 2);

      const assignments = db.prepare("SELECT * FROM shift_assignments WHERE week_id = ?").all(weekId);

      expect(assignments).toHaveLength(3);
    });

    it("should unassign staff from shift", () => {
      const db = getTestDatabase();

      const { lastInsertRowid: weekId } = db.prepare(INSERT_WEEK).run(2025, 1);
      db.prepare(INSERT_ASSIGNMENT).run(weekId, 1, 1);
      db.prepare("DELETE FROM shift_assignments WHERE week_id = ? AND staff_id = ? AND shift_id = ?").run(weekId, 1, 1);

      const assignment = db
        .prepare("SELECT * FROM shift_assignments WHERE week_id = ? AND staff_id = ? AND shift_id = ?")
        .get(weekId, 1, 1);

      expect(assignment).toBeUndefined();
    });
  });
});
