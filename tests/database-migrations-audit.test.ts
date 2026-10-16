import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateMainDatabase } from "~/server/utils/database-migrations.js";
import { columnNames } from "./helpers/schema";

describe("audit reason key migration", () => {
  it("adds key and values next to the stored text and keeps older entries as written", () => {
    const db = new Database(":memory:");
    migrateMainDatabase(db);
    // Back to the table before migration 010, with one entry written then.
    db.exec("ALTER TABLE audit_log DROP COLUMN reason_key");
    db.exec("ALTER TABLE audit_log DROP COLUMN reason_params");
    db.prepare("DELETE FROM schema_migrations WHERE id = '010_main_audit_reason_keys'").run();
    db.prepare(
      "INSERT INTO audit_log (user_id, username, action, year, week_number, reason) VALUES (1, 'planner', 'day_add', 2026, 41, 'nur Do. 08.10.')"
    ).run();

    const first = migrateMainDatabase(db);
    const second = migrateMainDatabase(db);

    expect(first.applied.map((migration) => migration.id)).toEqual(["010_main_audit_reason_keys"]);
    expect(second.applied).toHaveLength(0);
    expect(columnNames(db, "audit_log")).toEqual(expect.arrayContaining(["reason", "reason_key", "reason_params"]));
    expect(db.prepare("SELECT reason, reason_key, reason_params FROM audit_log").all()).toEqual([
      { reason: "nur Do. 08.10.", reason_key: null, reason_params: null },
    ]);
    db.close();
  });
});
