import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrateAdminDatabase, migrateMainDatabase } from "./database-migrations.js";
import { applyConfiguredPragmas, getDatabasePaths } from "~/server/config/database-config";

let db: DatabaseType | null = null;
let adminDb: DatabaseType | null = null;

function ensureDatabaseFolder(databasePath: string): void {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function logMigration(message: string): void {
  console.log(message);
}


export function getDatabase(): DatabaseType {
  if (!db) {
    const databasePath = getDatabasePaths().main;
    ensureDatabaseFolder(databasePath);
    db = new Database(databasePath);
    applyConfiguredPragmas(db);
    migrateMainDatabase(db, { logger: logMigration });
  }
  return db;
}


export function getAdminDatabase(): DatabaseType {
  if (!adminDb) {
    const databasePath = getDatabasePaths().admin;
    ensureDatabaseFolder(databasePath);
    adminDb = new Database(databasePath);
    applyConfiguredPragmas(adminDb);
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
