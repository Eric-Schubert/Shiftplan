import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestDatabase,
} from "./setup";

describe("Staff Operations", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  describe("Create Staff", () => {
    it("should create a new staff member", () => {
      const db = getTestDatabase();

      const result = db
        .prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)")
        .run("Test User", 1, 0);

      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeGreaterThan(0);
    });

    it("should create a part-time staff member", () => {
      const db = getTestDatabase();

      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)")
        .run("Part Timer", 1, 1);

      const staff = db
        .prepare("SELECT * FROM staff WHERE name = ?")
        .get("Part Timer") as any;

      expect(staff).toBeDefined();
      expect(staff.is_parttime).toBe(1);
    });
  });

  describe("Read Staff", () => {
    it("should return all staff members", () => {
      const db = getTestDatabase();

      db.prepare("INSERT INTO staff (name) VALUES (?)").run("User 1");
      db.prepare("INSERT INTO staff (name) VALUES (?)").run("User 2");

      const staff = db.prepare("SELECT * FROM staff").all();

      expect(staff).toHaveLength(2);
    });

    it("should return only active staff", () => {
      const db = getTestDatabase();

      db.prepare("INSERT INTO staff (name, active) VALUES (?, ?)").run("Active", 1);
      db.prepare("INSERT INTO staff (name, active) VALUES (?, ?)").run("Inactive", 0);

      const activeStaff = db
        .prepare("SELECT * FROM staff WHERE active = 1")
        .all();

      expect(activeStaff).toHaveLength(1);
    });
  });

  describe("Update Staff", () => {
    it("should update staff name", () => {
      const db = getTestDatabase();

      const { lastInsertRowid } = db
        .prepare("INSERT INTO staff (name) VALUES (?)")
        .run("Old Name");

      db.prepare("UPDATE staff SET name = ? WHERE staff_id = ?")
        .run("New Name", lastInsertRowid);

      const staff = db
        .prepare("SELECT * FROM staff WHERE staff_id = ?")
        .get(lastInsertRowid) as any;

      expect(staff.name).toBe("New Name");
    });

    it("should deactivate staff", () => {
      const db = getTestDatabase();

      const { lastInsertRowid } = db
        .prepare("INSERT INTO staff (name, active) VALUES (?, ?)")
        .run("Test", 1);

      db.prepare("UPDATE staff SET active = 0 WHERE staff_id = ?")
        .run(lastInsertRowid);

      const staff = db
        .prepare("SELECT * FROM staff WHERE staff_id = ?")
        .get(lastInsertRowid) as any;

      expect(staff.active).toBe(0);
    });
  });

  describe("Delete Staff", () => {
    it("should delete staff member", () => {
      const db = getTestDatabase();

      const { lastInsertRowid } = db
        .prepare("INSERT INTO staff (name) VALUES (?)")
        .run("To Delete");

      db.prepare("DELETE FROM staff WHERE staff_id = ?").run(lastInsertRowid);

      const staff = db
        .prepare("SELECT * FROM staff WHERE staff_id = ?")
        .get(lastInsertRowid);

      expect(staff).toBeUndefined();
    });
  });
});
