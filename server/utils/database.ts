import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrateAdminDatabase, migrateMainDatabase } from "./database-migrations.js";

const DATABASE_PATH = process.cwd() + "/db/db.sqlite";
const ADMIN_DB_PATH = process.cwd() + "/db/admin.sqlite";

let db: DatabaseType | null = null;
let adminDb: DatabaseType | null = null;

function ensureDatabaseFolder(): void {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
}

function logMigration(message: string): void {
  console.log(message);
}

// Haupt-Datenbank (Schichten, Mitarbeiter, Rotation)
export function getDatabase(): DatabaseType {
  if (!db) {
    ensureDatabaseFolder();
    db = new Database(DATABASE_PATH);
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    migrateMainDatabase(db, { logger: logMigration });
  }
  return db;
}

// Admin-Datenbank (Passwort, Einstellungen)
export function getAdminDatabase(): DatabaseType {
  if (!adminDb) {
    ensureDatabaseFolder();
    adminDb = new Database(ADMIN_DB_PATH);
    adminDb.pragma("foreign_keys = ON");
    adminDb.pragma("journal_mode = WAL");
    migrateAdminDatabase(adminDb, { logger: logMigration });
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
