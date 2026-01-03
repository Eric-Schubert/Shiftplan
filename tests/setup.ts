import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import * as fs from "node:fs";

const TEST_DB_PATH = "./db/test.sqlite";

let testDb: DatabaseType | null = null;

/**
 * Erstellt eine saubere Test-Datenbank
 */
export function setupTestDatabase(): DatabaseType {
  // Alte Test-DB löschen
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Verzeichnis erstellen falls nicht vorhanden
  if (!fs.existsSync("./db")) {
    fs.mkdirSync("./db");
  }

  testDb = new Database(TEST_DB_PATH);

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

/**
 * Löscht die Test-Datenbank
 */
export function cleanupTestDatabase(): void {
  closeTestDatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

/**
 * Fügt Demo-Daten für Tests ein
 */
export function insertTestData(db: DatabaseType): void {
  // Staff
  db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)").run("Max Mustermann", 1, 0);
  db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)").run("Erika Musterfrau", 1, 0);
  db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)").run("Hans Teilzeit", 1, 1);

  // Shifts
  db.prepare("INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)").run("Frühschicht", "06:00", "14:00", "#22c55e", 2, 1);
  db.prepare("INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)").run("Spätschicht", "14:00", "22:00", "#3b82f6", 2, 2);
  db.prepare("INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)").run("Nachtschicht", "22:00", "06:00", "#8b5cf6", 1, 3);

  // Rotation config
  db.prepare("INSERT OR IGNORE INTO rotation_config (config_id, cycle_length, start_year, start_week) VALUES (1, 4, 2025, 1)").run();
}
