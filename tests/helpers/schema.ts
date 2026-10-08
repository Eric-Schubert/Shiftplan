import type { Database as DatabaseType } from "better-sqlite3";

export function columnNames(db: DatabaseType, table: string): string[] {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((column: any) => column.name);
}
