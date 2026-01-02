import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

const DATABASE_PATH = process.cwd() + "/db/db.sqlite";
const ADMIN_DB_PATH = process.cwd() + "/db/admin.sqlite";

let db: DatabaseType | null = null;
let adminDb: DatabaseType | null = null;

// Haupt-Datenbank (Schichten, Mitarbeiter, Rotation)
export function getDatabase(): DatabaseType {
  if (!db) {
    db = new Database(DATABASE_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

// Admin-Datenbank (Passwort, Einstellungen)
export function getAdminDatabase(): DatabaseType {
  if (!adminDb) {
    adminDb = new Database(ADMIN_DB_PATH);
    adminDb.pragma("journal_mode = WAL");
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
