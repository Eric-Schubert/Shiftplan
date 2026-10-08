import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateMainDatabase } from "~/server/utils/database-migrations.js";
import { assignMissingShortCodes } from "~/server/utils/staff-short-code.js";

describe("database migrations", () => {
  it("gives existing staff a unique Kürzel from their initials", () => {
    const db = new Database(":memory:");
    migrateMainDatabase(db);
    db.exec("DROP INDEX idx_staff_short_code");
    db.exec("ALTER TABLE staff DROP COLUMN short_code");
    for (const name of ["Max Mustermann", "Maria Meier", "Özlem Yılmaz", "Cher", "AL", "KMS"]) {
      db.prepare("INSERT INTO staff (name) VALUES (?)").run(name);
    }
    db.prepare("DELETE FROM schema_migrations WHERE id = '008_main_staff_short_code'").run();

    migrateMainDatabase(db);

    const codes = (db.prepare("SELECT short_code FROM staff ORDER BY staff_id").all() as Array<{ short_code: string }>).map(
      (row) => row.short_code
    );
    expect(codes).toEqual(["MM", "MM2", "OY", "CHER", "AL", "KMS"]);
    db.close();
  });

  it("fills in Kürzel for staff added after the migration", () => {
    const db = new Database(":memory:");
    migrateMainDatabase(db);
    db.prepare("INSERT INTO staff (name, short_code) VALUES ('Max Muster', 'MM')").run();
    db.prepare("INSERT INTO staff (name) VALUES ('Mia Meyer')").run();
    db.prepare("INSERT INTO staff (name) VALUES ('AL')").run();

    expect(assignMissingShortCodes(db)).toBe(2);
    expect(assignMissingShortCodes(db)).toBe(0);
    expect(db.prepare("SELECT short_code FROM staff ORDER BY staff_id").all()).toEqual([
      { short_code: "MM" },
      { short_code: "MM2" },
      { short_code: "AL" },
    ]);
    db.close();
  });
});
