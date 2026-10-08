export function tableExists(database, table) {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return Boolean(row);
}

export function indexExists(database, index) {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
    .get(index);
  return Boolean(row);
}

export function getTableColumns(database, table) {
  if (!tableExists(database, table)) return new Set();
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  return new Set(columns.map((column) => column.name));
}

export function hasMissingColumns(database, table, columns) {
  const existing = getTableColumns(database, table);
  return columns.some((column) => !existing.has(column));
}

export function addColumnIfMissing(database, table, column, definition) {
  const columns = getTableColumns(database, table);
  if (!columns.has(column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
  }
  return false;
}
