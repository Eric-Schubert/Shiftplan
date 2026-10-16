// @ts-check

/** @typedef {import("better-sqlite3").Database} Database */

/**
 * @typedef {object} MigrationOptions
 * @property {(message: string) => void} [logger] Prints which migrations ran.
 * @property {string} [bootstrapAdminPassword] First admin password, instead of SHIFTPLAN_ADMIN_PASSWORD.
 */

/**
 * @typedef {object} Migration
 * @property {string} id
 * @property {string} description
 * @property {(database: Database, options: MigrationOptions) => boolean} shouldRun
 * @property {(database: Database, options: MigrationOptions) => void} up
 */

/** @param {Database} database */
function ensureSchemaMigrationsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * @param {Database} database
 * @param {Migration} migration
 */
function recordMigration(database, migration) {
  database
    .prepare(
      "INSERT OR REPLACE INTO schema_migrations (id, description, applied_at) VALUES (?, ?, datetime('now'))"
    )
    .run(migration.id, migration.description);
}

/**
 * @param {Database} database
 * @param {string} databaseName
 * @param {Migration[]} migrations
 * @param {MigrationOptions} [options]
 */
export function runMigrations(database, databaseName, migrations, options = {}) {
  ensureSchemaMigrationsTable(database);

  const applied = [];
  for (const migration of migrations) {
    if (!migration.shouldRun(database, options)) continue;

    const run = database.transaction(() => {
      migration.up(database, options);
      recordMigration(database, migration);
    });
    run();
    applied.push({ id: migration.id, description: migration.description });
  }

  const logger = options.logger;
  if (logger) {
    if (applied.length === 0) {
      logger(`[db:migrate] ${databaseName} database up to date`);
    } else {
      for (const migration of applied) {
        logger(`[db:migrate] ${databaseName}: applied ${migration.id} - ${migration.description}`);
      }
    }
  }

  return { databaseName, applied };
}
