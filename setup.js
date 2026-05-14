import Database from "better-sqlite3";
import * as fs from "node:fs";
import path from "node:path";
import {
  migrateAdminDatabase,
  migrateMainDatabase,
} from "./server/utils/database-migrations.js";

const backendConfig = loadBackendConfig();
const DATABASE_FOLDER = backendConfig.database.directory;
const DATABASE_PATH = path.join(DATABASE_FOLDER, backendConfig.database.mainFile);
const ADMIN_DB_PATH = path.join(DATABASE_FOLDER, backendConfig.database.adminFile);

console.log(`[setup.js] => setting up databases...`);


if (!fs.existsSync(DATABASE_FOLDER)) {
  fs.mkdirSync(DATABASE_FOLDER);
}



console.log(`[setup.js] => creating '${DATABASE_PATH}'...`);
const db = new Database(DATABASE_PATH);
applyConfiguredPragmas(db);
migrateMainDatabase(db, { logger: console.log });



console.log(`[setup.js] => creating '${ADMIN_DB_PATH}'...`);
const adminDb = new Database(ADMIN_DB_PATH);
applyConfiguredPragmas(adminDb);
migrateAdminDatabase(adminDb, { logger: console.log });

adminDb.close();


const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get();
if (staffCount.count === 0) {
  console.log("[setup.js] => inserting demo data...");


  const insertStaff = db.prepare(
    "INSERT INTO staff (name, active, is_parttime) VALUES (?, ?, ?)"
  );
  insertStaff.run("Max Mustermann", 1, 0);
  insertStaff.run("Erika Musterfrau", 1, 0);
  insertStaff.run("Hans Schmidt", 1, 1);
  insertStaff.run("Anna Weber", 1, 0);
  insertStaff.run("Peter Müller", 1, 1);


  const insertShift = db.prepare(
    "INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insertShift.run("Früh", "06:00", "14:00", "#22c55e", 2, 1);
  insertShift.run("Spät", "14:00", "22:00", "#3b82f6", 2, 2);
  insertShift.run("Nacht", "22:00", "06:00", "#8b5cf6", 1, 3);


  const rotationConfigCount = db
    .prepare("SELECT COUNT(*) as count FROM rotation_config")
    .get();
  if (rotationConfigCount.count === 0) {
    db.prepare(
      "INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (?, ?, ?)"
    ).run(
      backendConfig.rotation.defaultCycleLength,
      2025,
      backendConfig.rotation.defaultStartWeek
    );
  }
}

console.log("[setup.js] => setup finished!");

db.close();

function loadBackendConfig() {
  const configuredPath = process.env.SHIFTPLAN_BACKEND_CONFIG_PATH?.trim();
  const configPath = configuredPath
    ? path.resolve(configuredPath)
    : path.resolve(process.cwd(), "config", "backend.config.json");

  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

function applyConfiguredPragmas(database) {
  if (backendConfig.database.pragmas.foreignKeys) {
    database.pragma("foreign_keys = ON");
  }

  if (backendConfig.database.pragmas.journalMode) {
    database.pragma(`journal_mode = ${backendConfig.database.pragmas.journalMode}`);
  }
}
