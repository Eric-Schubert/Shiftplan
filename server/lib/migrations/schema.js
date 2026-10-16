// @ts-check

/** @typedef {import("better-sqlite3").Database} Database */

/**
 * @param {Database} database
 * @param {string} table
 */
export function tableExists(database, table) {
  const row = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return Boolean(row);
}

/**
 * @param {Database} database
 * @param {string} index
 */
export function indexExists(database, index) {
  const row = database.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?").get(index);
  return Boolean(row);
}

/**
 * @param {Database} database
 * @param {string} table
 * @returns {Set<string>}
 */
export function getTableColumns(database, table) {
  if (!tableExists(database, table)) return new Set();
  const columns = /** @type {{ name: string }[]} */ (database.prepare(`PRAGMA table_info(${table})`).all());
  return new Set(columns.map((column) => column.name));
}

/**
 * @param {Database} database
 * @param {string} table
 * @param {string[]} columns
 */
export function hasMissingColumns(database, table, columns) {
  const existing = getTableColumns(database, table);
  return columns.some((column) => !existing.has(column));
}

/**
 * @param {Database} database
 * @param {string} table
 * @param {string} column
 * @param {string} definition Column type and constraints, e.g. "TEXT NOT NULL DEFAULT 'de'".
 */
export function addColumnIfMissing(database, table, column, definition) {
  const columns = getTableColumns(database, table);
  if (!columns.has(column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
  }
  return false;
}

/**
 * Whether a migration already ran. For data fixes whose condition could come true again later.
 * @param {Database} database
 * @param {string} id
 */
export function migrationApplied(database, id) {
  if (!tableExists(database, "schema_migrations")) return false;
  return Boolean(database.prepare("SELECT 1 FROM schema_migrations WHERE id = ?").get(id));
}
