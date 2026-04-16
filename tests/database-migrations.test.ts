import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  migrateAdminDatabase,
  migrateMainDatabase,
} from "../server/utils/database-migrations.js";

function columnNames(db: DatabaseType, table: string): string[] {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((column: any) => column.name);
}

describe("database migrations", () => {
  it("creates the main schema on a fresh database and stays idempotent", () => {
    const db = new Database(":memory:");

    const first = migrateMainDatabase(db);
    const second = migrateMainDatabase(db);

    expect(first.applied.map((migration) => migration.id)).toEqual([
      "001_main_core_schema",
      "002_main_rotation_schema",
      "003_main_audit_schema",
    ]);
    expect(second.applied).toHaveLength(0);
    expect(columnNames(db, "staff")).toEqual(
      expect.arrayContaining(["staff_id", "name", "active", "is_parttime"])
    );
    expect(columnNames(db, "audit_log")).toContain("created_at");

    db.close();
  });

  it("adds missing created_at to legacy users without losing accounts", async () => {
    const db = new Database(":memory:");
    const passwordHash = bcrypt.hashSync("secret", 4);

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        active INTEGER NOT NULL DEFAULT 1
      );
    `);
    db.prepare("INSERT INTO users (username, password_hash, role, active) VALUES (?, ?, 'admin', 1)")
      .run("admin", passwordHash);

    const result = migrateAdminDatabase(db);
    const user = db
      .prepare("SELECT user_id, username, role, active, created_at, password_hash FROM users WHERE username = ?")
      .get("admin") as any;

    expect(result.applied.map((migration) => migration.id)).toContain("002_admin_users_schema");
    expect(user.created_at).toBeTruthy();
    expect(await bcrypt.compare("secret", user.password_hash)).toBe(true);

    db.close();
  });

  it("migrates settings-only legacy admin password into users", async () => {
    const db = new Database(":memory:");
    const passwordHash = bcrypt.hashSync("legacy-pass", 4);

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?)").run(passwordHash);

    migrateAdminDatabase(db);
    const user = db
      .prepare("SELECT username, role, active, created_at, password_hash FROM users WHERE username = 'admin'")
      .get() as any;

    expect(user.username).toBe("admin");
    expect(user.role).toBe("admin");
    expect(user.active).toBe(1);
    expect(user.created_at).toBeTruthy();
    expect(await bcrypt.compare("legacy-pass", user.password_hash)).toBe(true);

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
