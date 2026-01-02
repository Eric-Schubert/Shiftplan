import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

const DATABASE_PATH = process.cwd() + "/db/db.sqlite";

let db: DatabaseType | null = null;

export function getDatabase(): DatabaseType {
  if (!db) {
    db = new Database(DATABASE_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
