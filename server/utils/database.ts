import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrateAdminDatabase, migrateMainDatabase } from "./database-migrations.js";
import { assignMissingShortCodes } from "../lib/migrations/staff-short-code.js";
import { applyConfiguredPragmas, getDatabasePaths } from "~/server/config/database-config";

let db: DatabaseType | null = null;
let adminDb: DatabaseType | null = null;

function ensureDatabaseFolder(databasePath: string): void {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function logMigration(message: string): void {
  console.log(message);
}

/**
 * Opens and migrates a database. Only a fully migrated one is handed out: when a migration throws
 * (say, on unchanged default credentials), the handle is closed and the next call tries again,
 * instead of every later request getting a half-migrated database.
 */
function openDatabase(databasePath: string, migrate: (database: DatabaseType) => void): DatabaseType {
  ensureDatabaseFolder(databasePath);
  const database = new Database(databasePath);
  try {
    applyConfiguredPragmas(database);
    migrate(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export function getDatabase(): DatabaseType {
  db ??= openDatabase(getDatabasePaths().main, (database) => {
    migrateMainDatabase(database, { logger: logMigration });
    // setup.js adds its sample staff after the migrations, so they need a short code here.
    assignMissingShortCodes(database);
  });
  return db;
}

export function getAdminDatabase(): DatabaseType {
  adminDb ??= openDatabase(getDatabasePaths().admin, (database) => migrateAdminDatabase(database, { logger: logMigration }));
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
