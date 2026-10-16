import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { migrateAdminDatabase, migrateMainDatabase } from "~/server/utils/database-migrations.js";
import { applyConfiguredPragmas } from "~/server/config/database-config";

// Stands in for server/utils/database: the same migrations and pragmas, but in memory, so service
// tests need no temp directory. Use it with
//   vi.mock("~/server/utils/database", () => import("./helpers/memory-database"));
// and call closeDatabase() before each test for a fresh, empty schema.

let db: DatabaseType | null = null;
let adminDb: DatabaseType | null = null;

function open(migrate: (database: DatabaseType) => void): DatabaseType {
  const database = new Database(":memory:");
  applyConfiguredPragmas(database);
  migrate(database);
  return database;
}

export function getDatabase(): DatabaseType {
  db ??= open((database) => migrateMainDatabase(database));
  return db;
}

export function getAdminDatabase(): DatabaseType {
  adminDb ??= open((database) => migrateAdminDatabase(database, { bootstrapAdminPassword: "BootstrapPass1" }));
  return adminDb;
}

export function closeDatabase(): void {
  db?.close();
  adminDb?.close();
  db = null;
  adminDb = null;
}
