import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

let testDb: DatabaseType | null = null;

/**
 * Erstellt eine saubere In-Memory Test-Datenbank
 */
export function setupTestDatabase(): DatabaseType {
  // Alte Verbindung schließen falls vorhanden
  if (testDb) {
    testDb.close();
  }

  // In-Memory Datenbank - keine Datei-Locks!
  testDb = new Database(":memory:");

  // Schema erstellen
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      is_parttime INTEGER DEFAULT 0
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      min_staff INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS weeks (
      week_id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      UNIQUE(year, week_number)
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS shift_assignments (
      assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id INTEGER NOT NULL,
      staff_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      FOREIGN KEY (week_id) REFERENCES weeks(week_id),
      FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
      FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
      UNIQUE(week_id, staff_id, shift_id)
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS rotation_config (
      config_id INTEGER PRIMARY KEY CHECK (config_id = 1),
      cycle_length INTEGER NOT NULL DEFAULT 4,
      start_year INTEGER NOT NULL DEFAULT 2025,
      start_week INTEGER NOT NULL DEFAULT 1
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS rotation_pattern (
      pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_week INTEGER NOT NULL,
      staff_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
      FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
      UNIQUE(pattern_week, staff_id, shift_id)
    )
  `);

  testDb.exec(`
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

  return testDb;
}

/**
 * Gibt die Test-Datenbank zurück
 */
export function getTestDatabase(): DatabaseType {
  if (!testDb) {
    throw new Error("Test database not initialized. Call setupTestDatabase() first.");
  }
  return testDb;
}

/**
 * Schließt die Test-Datenbank
 */
export function closeTestDatabase(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

/** Alias für Abwärtskompatibilität mit bestehenden Tests */
export const cleanupTestDatabase = closeTestDatabase;

/**
 * Fügt Test-Daten ein (Mitarbeiter + Schichten)
 */
export function insertTestData(db: DatabaseType): void {
  // Test-Mitarbeiter
  db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)").run("Test User 1", 1, 0);
  db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)").run("Test User 2", 1, 0);
  db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)").run("Test User 3", 1, 1);

  // Test-Schichten
  db.prepare("INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)").run("Früh", "06:00", "14:00", "#22c55e", 2, 1);
  db.prepare("INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)").run("Spät", "14:00", "22:00", "#3b82f6", 2, 2);

  // Rotation Config
  db.prepare("INSERT OR IGNORE INTO rotation_config (config_id, cycle_length, start_year, start_week) VALUES (1, 4, 2025, 1)").run();
}
