import Database from "better-sqlite3";
import * as fs from "node:fs";
import bcrypt from "bcryptjs";

const DATABASE_FOLDER = "db";
const DATABASE_PATH = `./${DATABASE_FOLDER}/db.sqlite`;
const ADMIN_DB_PATH = `./${DATABASE_FOLDER}/admin.sqlite`;

console.log(`[setup.js] => setting up databases...`);

// Verzeichnis für die Datenbank erstellen, falls nicht vorhanden
if (!fs.existsSync(DATABASE_FOLDER)) {
  fs.mkdirSync(DATABASE_FOLDER);
}

// ============================================
// HAUPT-DATENBANK (Schichten, Mitarbeiter, etc.)
// ============================================
console.log(`[setup.js] => creating '${DATABASE_PATH}'...`);
const db = new Database(DATABASE_PATH);

// Tabelle staff erstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS staff (
    staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
    active INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    is_parttime INTEGER NOT NULL DEFAULT 0
  )
`);

// Tabelle shifts erstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS shifts (
    shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    min_staff INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`);

// Tabelle weeks erstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS weeks (
    week_id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    UNIQUE(year, week_number)
  )
`);

// Tabelle shift_assignments erstellen (Zuordnung Mitarbeiter zu Schichten pro Woche)
db.exec(`
  CREATE TABLE IF NOT EXISTS shift_assignments (
    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    shift_id INTEGER NOT NULL,
    week_id INTEGER NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE,
    FOREIGN KEY (week_id) REFERENCES weeks(week_id) ON DELETE CASCADE,
    UNIQUE(staff_id, shift_id, week_id)
  )
`);

// ============================================
// ADMIN-DATENBANK (Passwort, Einstellungen)
// ============================================
console.log(`[setup.js] => creating '${ADMIN_DB_PATH}'...`);
const adminDb = new Database(ADMIN_DB_PATH);

adminDb.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

// Standard Admin-Passwort setzen (falls nicht vorhanden)
const existingPassword = adminDb.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
if (!existingPassword) {
  // Standard-Passwort: admin (gehasht mit bcrypt)
  const hashedPassword = bcrypt.hashSync("admin", 10);
  adminDb.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("admin_password", hashedPassword);
  console.log("[setup.js] => Default admin password set to: admin (hashed with bcrypt)");
}

adminDb.close();

// ============================================
// NEUE TABELLEN FÜR ROTATIONSMUSTER
// ============================================

// Rotationskonfiguration (Zykluslänge, Startdatum)
db.exec(`
  CREATE TABLE IF NOT EXISTS rotation_config (
    config_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_length INTEGER NOT NULL DEFAULT 4,
    start_year INTEGER NOT NULL,
    start_week INTEGER NOT NULL
  )
`);

// Rotationsmuster: Wer arbeitet in welcher Musterwoche welche Schicht
db.exec(`
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

// Demo-Daten einfügen (nur wenn Tabellen leer sind)
const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get();
if (staffCount.count === 0) {
  console.log("[setup.js] => inserting demo data...");

  // Demo Mitarbeiter
  const insertStaff = db.prepare(
    "INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)"
  );
  insertStaff.run("Max Mustermann", 1, 0);
  insertStaff.run("Erika Musterfrau", 1, 0);
  insertStaff.run("Hans Schmidt", 1, 1);
  insertStaff.run("Anna Weber", 1, 0);
  insertStaff.run("Peter Müller", 1, 1);

  // Demo Schichten
  const insertShift = db.prepare(
    "INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insertShift.run("Früh", "06:00", "14:00", "#22c55e", 2, 1);
  insertShift.run("Spät", "14:00", "22:00", "#3b82f6", 2, 2);
  insertShift.run("Nacht", "22:00", "06:00", "#8b5cf6", 1, 3);

  // Standard Rotationskonfiguration: 4-Wochen-Zyklus ab KW1 2025
  db.prepare(
    "INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (?, ?, ?)"
  ).run(4, 2025, 1);
}

console.log("[setup.js] => setup finished!");

db.close();
