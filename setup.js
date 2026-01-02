import Database from "better-sqlite3";
import * as fs from "node:fs";

const DATABASE_FOLDER = "db";
const DATABASE_NAME = "db.sqlite";
const DATABASE_PATH = `./${DATABASE_FOLDER}/${DATABASE_NAME}`;

console.log(`[setup.js] => create database '${DATABASE_PATH}'...`);

// Verzeichnis für die Datenbank erstellen, falls nicht vorhanden
if (!fs.existsSync(DATABASE_FOLDER)) {
  fs.mkdirSync(DATABASE_FOLDER);
}

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
}

console.log("[setup.js] => setup finished!");

db.close();
