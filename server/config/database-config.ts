import path from "node:path";
import type { Database as DatabaseType } from "better-sqlite3";
import { getBackendConfig } from "./backend-config";

export function getDatabasePaths(): { main: string; admin: string } {
  const config = getBackendConfig().database;
  const directory = path.isAbsolute(config.directory)
    ? config.directory
    : path.resolve(process.cwd(), config.directory);

  return {
    main: path.resolve(directory, config.mainFile),
    admin: path.resolve(directory, config.adminFile),
  };
}

export function applyConfiguredPragmas(database: DatabaseType): void {
  const pragmas = getBackendConfig().database.pragmas;

  if (pragmas.foreignKeys) {
    database.pragma("foreign_keys = ON");
  }

  if (pragmas.journalMode) {
    database.pragma(`journal_mode = ${pragmas.journalMode}`);
  }
}
