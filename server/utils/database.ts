import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import bcrypt from "bcryptjs";

const DATABASE_PATH = process.cwd() + "/db/db.sqlite";
const ADMIN_DB_PATH = process.cwd() + "/db/admin.sqlite";

let db: DatabaseType | null = null;
let adminDb: DatabaseType | null = null;

function getTableColumns(database: DatabaseType, table: string): Set<string> {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(columns.map(column => column.name));
}

function ensureMainDatabaseSchema(database: DatabaseType): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS rotation_config (
      config_id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_length INTEGER NOT NULL DEFAULT 4,
      start_year INTEGER NOT NULL,
      start_week INTEGER NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS rotation_pattern (
      pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_week INTEGER NOT NULL,
      staff_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
      FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE,
      UNIQUE(pattern_week, staff_id, shift_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      year INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      shift_id INTEGER,
      shift_name TEXT,
      staff_id INTEGER,
      staff_name TEXT,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const auditColumns = getTableColumns(database, "audit_log");
  if (!auditColumns.has("created_at")) {
    database.exec("ALTER TABLE audit_log ADD COLUMN created_at TEXT");
    database.exec("UPDATE audit_log SET created_at = datetime('now') WHERE created_at IS NULL");
  }
}

function normalizePasswordHash(password: string): string {
  return /^\$2[aby]\$/.test(password) ? password : bcrypt.hashSync(password, 10);
}

function ensureAdminDatabaseSchema(database: DatabaseType): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'planner' CHECK(role IN ('admin', 'planner')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const userColumns = getTableColumns(database, "users");
  if (!userColumns.has("password_hash")) {
    database.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  }
  if (!userColumns.has("role")) {
    database.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'");
  }
  if (!userColumns.has("active")) {
    database.exec("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  }
  if (!userColumns.has("created_at")) {
    database.exec("ALTER TABLE users ADD COLUMN created_at TEXT");
    database.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL");
  }

  database.exec("UPDATE users SET role = 'admin' WHERE role IS NULL OR role = ''");
  database.exec("UPDATE users SET active = 1 WHERE active IS NULL");
  database.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL");

  const legacyPassword = database
    .prepare("SELECT value FROM settings WHERE key = 'admin_password'")
    .get() as { value: string } | undefined;

  const defaultPasswordHash = normalizePasswordHash(legacyPassword?.value || "admin");
  database
    .prepare("UPDATE users SET password_hash = ? WHERE password_hash IS NULL OR password_hash = ''")
    .run(defaultPasswordHash);

  const existingUsers = database.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (existingUsers.count > 0) return;

  database
    .prepare("INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, 'admin', 1, datetime('now'))")
    .run("admin", defaultPasswordHash);

  if (!legacyPassword) {
    database
      .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
      .run("admin_password", defaultPasswordHash);
  }
}

// Haupt-Datenbank (Schichten, Mitarbeiter, Rotation)
export function getDatabase(): DatabaseType {
  if (!db) {
    db = new Database(DATABASE_PATH);
    db.pragma("journal_mode = WAL");
    ensureMainDatabaseSchema(db);
  }
  return db;
}

// Admin-Datenbank (Passwort, Einstellungen)
export function getAdminDatabase(): DatabaseType {
  if (!adminDb) {
    adminDb = new Database(ADMIN_DB_PATH);
    adminDb.pragma("journal_mode = WAL");
    ensureAdminDatabaseSchema(adminDb);
  }
  return adminDb;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
  if (adminDb) {
    adminDb.close();
    adminDb = null;
  }
}
