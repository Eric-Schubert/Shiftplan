import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateMainDatabase } from "~/server/utils/database-migrations.js";
import { validateName } from "~/server/utils/validation";

describe("validateName", () => {
  it("stores names as typed, so saving again changes nothing", () => {
    for (const name of ["F&B Spät", "R&D", "A < B > C", "&#39;quoted&#39;", "Tom &amp; Jerry"]) {
      const saved = validateName(name, "name", { required: true });
      expect(saved).toBe(name);
      expect(validateName(saved, "name", { required: true })).toBe(saved);
    }
  });

  it("turns control characters into spaces and trims", () => {
    expect(validateName("  Anna\u000bBecker\t ", "name")).toBe("Anna Becker");
    expect(validateName("Früh\r\nlang", "name")).toBe("Früh lang");
  });
});

describe("name unescape migration", () => {
  it("repairs names escaped once or several times, also in the audit log, and runs only once", () => {
    const db = new Database(":memory:");
    migrateMainDatabase(db);
    db.prepare("DELETE FROM schema_migrations WHERE id = '011_main_unescape_names'").run();
    db.prepare("INSERT INTO staff (name, short_code) VALUES ('F&amp;amp;B Team', 'FB'), ('Anna Weber', 'AW')").run();
    db.prepare("INSERT INTO shifts (name, start_time, end_time) VALUES ('R&amp;D', '06:00', '14:00')").run();
    db.prepare(
      "INSERT INTO audit_log (user_id, username, action, year, week_number, staff_name, shift_name) VALUES (1, 'planner', 'assign', 2026, 41, 'F&amp;B Team', 'R&amp;amp;amp;D')"
    ).run();

    const first = migrateMainDatabase(db);
    db.prepare("UPDATE staff SET name = 'Tom &amp; Jerry' WHERE short_code = 'AW'").run();
    const second = migrateMainDatabase(db);

    expect(first.applied.map((migration) => migration.id)).toEqual(["011_main_unescape_names"]);
    expect(second.applied).toHaveLength(0);
    expect(db.prepare("SELECT name FROM staff ORDER BY staff_id").all()).toEqual([{ name: "F&B Team" }, { name: "Tom &amp; Jerry" }]);
    expect(db.prepare("SELECT name FROM shifts").get()).toEqual({ name: "R&D" });
    expect(db.prepare("SELECT staff_name, shift_name FROM audit_log").get()).toEqual({ staff_name: "F&B Team", shift_name: "R&D" });
    db.close();
  });
});
