import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { migrateAdminDatabase } from "~/server/utils/database-migrations.js";
import { columnNames } from "./helpers/schema";

describe("database migrations", () => {
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

  it("requires a bootstrap password for a fresh admin database", () => {
    const db = new Database(":memory:");

    expect(() => migrateAdminDatabase(db)).toThrow(/SHIFTPLAN_ADMIN_PASSWORD/);

    db.close();
  });

  it("seeds a fresh admin database from a bootstrap password", async () => {
    const db = new Database(":memory:");

    migrateAdminDatabase(db, { bootstrapAdminPassword: "BootstrapPass1" });
    const user = db
      .prepare("SELECT username, role, active, created_at, password_hash FROM users WHERE username = 'admin'")
      .get() as any;

    expect(user.username).toBe("admin");
    expect(user.role).toBe("admin");
    expect(user.active).toBe(1);
    expect(user.created_at).toBeTruthy();
    expect(await bcrypt.compare("BootstrapPass1", user.password_hash)).toBe(true);
    expect(columnNames(db, "contact_messages")).toEqual(
      expect.arrayContaining(["contact_id", "name", "reply_to", "message", "created_at", "read_at"])
    );

    db.close();
  });

  it("rotates insecure default admin credentials with a bootstrap password", async () => {
    const db = new Database(":memory:");

    db.exec(`
      CREATE TABLE users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.prepare(
      "INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, 'admin', 1, datetime('now'))"
    ).run("admin", bcrypt.hashSync("admin", 4));

    migrateAdminDatabase(db, { bootstrapAdminPassword: "SecureAdmin1" });
    const user = db
      .prepare("SELECT password_hash FROM users WHERE username = 'admin'")
      .get() as any;

    expect(await bcrypt.compare("SecureAdmin1", user.password_hash)).toBe(true);
    expect(await bcrypt.compare("admin", user.password_hash)).toBe(false);

    db.close();
  });
});
