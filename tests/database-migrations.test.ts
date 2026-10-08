import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateMainDatabase } from "~/server/utils/database-migrations.js";
import { columnNames } from "./helpers/schema";

describe("database migrations", () => {
  it("creates the main schema on a fresh database and stays idempotent", () => {
    const db = new Database(":memory:");

    const first = migrateMainDatabase(db);
    const second = migrateMainDatabase(db);

    expect(first.applied.map((migration) => migration.id)).toEqual([
      "001_main_core_schema",
      "002_main_rotation_schema",
      "003_main_audit_schema",
      "004_main_page_visits_schema",
      "005_main_absences_schema",
      "006_main_absence_ranges_day_changes",
      "007_main_shift_requests",
      "008_main_staff_short_code",
    ]);
    expect(second.applied).toHaveLength(0);
    expect(columnNames(db, "absences")).toEqual(
      expect.arrayContaining(["staff_id", "absence_date", "shift_id", "reason", "source", "cancelled_at"])
    );
    expect(columnNames(db, "audit_log")).toContain("source");
    expect(columnNames(db, "staff")).toEqual(
      expect.arrayContaining(["staff_id", "name", "active", "is_parttime"])
    );
    expect(columnNames(db, "audit_log")).toContain("created_at");
    expect(columnNames(db, "page_visits")).toEqual(
      expect.arrayContaining(["visit_date", "path", "visitor_hash", "country_code", "created_at"])
    );

    db.close();
  });

  it("turns old sick-leave reasons into „sonstiges“ when absences get ranges", () => {
    const db = new Database(":memory:");
    migrateMainDatabase(db);
    // Back to the table as migration 005 created it, with one old entry.
    db.exec("DROP TABLE absences");
    db.exec(`
      CREATE TABLE absences (
        absence_id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        absence_date TEXT NOT NULL,
        shift_id INTEGER,
        reason TEXT CHECK(reason IS NULL OR reason IN ('krank', 'privat', 'sonstiges')),
        note TEXT,
        source TEXT NOT NULL DEFAULT 'web',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        cancelled_at TEXT
      )
    `);
    db.exec("CREATE UNIQUE INDEX idx_absences_active_staff_date ON absences(staff_id, absence_date) WHERE cancelled_at IS NULL");
    db.prepare("INSERT INTO staff (name) VALUES ('Anna')").run();
    db.prepare("INSERT INTO absences (staff_id, absence_date, reason, created_by) VALUES (1, '2026-10-08', 'krank', 'planner')").run();
    db.prepare("DELETE FROM schema_migrations WHERE id = '006_main_absence_ranges_day_changes'").run();

    const result = migrateMainDatabase(db);

    expect(result.applied.map((migration) => migration.id)).toEqual(["006_main_absence_ranges_day_changes"]);
    expect(db.prepare("SELECT absence_id, reason, batch_id FROM absences").all()).toEqual([
      { absence_id: 1, reason: "sonstiges", batch_id: null },
    ]);
    expect(() =>
      db.prepare("INSERT INTO absences (staff_id, absence_date, reason, created_by) VALUES (1, '2026-10-09', 'krank', 'x')").run()
    ).toThrow();
    db.close();
  });

  it("normalizes legacy audit tables without created_at", () => {
    const db = new Database(":memory:");

    db.exec(`
      CREATE TABLE audit_log (
        audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        year INTEGER NOT NULL,
        week_number INTEGER NOT NULL
      );
    `);

    migrateMainDatabase(db);

    expect(columnNames(db, "audit_log")).toEqual(
      expect.arrayContaining(["created_at", "reason", "shift_id", "staff_id"])
    );

    db.close();
  });
});
