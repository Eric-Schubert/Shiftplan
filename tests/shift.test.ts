import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestDatabase,
} from "./setup";

describe("Shift Operations", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe("Create Shift", () => {
    it("should create a new shift", () => {
      const db = getTestDatabase();
      
      const result = db
        .prepare(
          "INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("Testschicht", "08:00", "16:00", "#ff0000", 2, 1);

      expect(result.changes).toBe(1);
    });

    it("should set default values", () => {
      const db = getTestDatabase();
      
      db.prepare(
        "INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)"
      ).run("Minimal", "09:00", "17:00");

      const shift = db
        .prepare("SELECT * FROM shifts WHERE name = ?")
        .get("Minimal") as any;

      expect(shift.color).toBe("#6366f1");
      expect(shift.min_staff).toBe(1);
      expect(shift.active).toBe(1);
    });
  });

  describe("Read Shifts", () => {
    it("should return shifts sorted by sort_order", () => {
      const db = getTestDatabase();
      
      db.prepare(
        "INSERT INTO shifts (name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?)"
      ).run("Third", "00:00", "08:00", 3);
      db.prepare(
        "INSERT INTO shifts (name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?)"
      ).run("First", "08:00", "16:00", 1);
      db.prepare(
        "INSERT INTO shifts (name, start_time, end_time, sort_order) VALUES (?, ?, ?, ?)"
      ).run("Second", "16:00", "00:00", 2);

      const shifts = db
        .prepare("SELECT * FROM shifts ORDER BY sort_order")
        .all() as any[];

      expect(shifts[0].name).toBe("First");
      expect(shifts[1].name).toBe("Second");
      expect(shifts[2].name).toBe("Third");
    });
  });

  describe("Update Shift", () => {
    it("should update shift times", () => {
      const db = getTestDatabase();
      
      const { lastInsertRowid } = db
        .prepare(
          "INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)"
        )
        .run("Test", "08:00", "16:00");

      db.prepare(
        "UPDATE shifts SET start_time = ?, end_time = ? WHERE shift_id = ?"
      ).run("07:00", "15:00", lastInsertRowid);

      const shift = db
        .prepare("SELECT * FROM shifts WHERE shift_id = ?")
        .get(lastInsertRowid) as any;

      expect(shift.start_time).toBe("07:00");
      expect(shift.end_time).toBe("15:00");
    });
  });
});
