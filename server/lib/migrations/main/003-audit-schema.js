import { addColumnIfMissing, hasMissingColumns, tableExists } from "../schema.js";

export default {
  id: "003_main_audit_schema",
  description: "Create and normalize audit log table",
  shouldRun(database) {
    return (
      !tableExists(database, "audit_log") ||
      hasMissingColumns(database, "audit_log", [
        "shift_id",
        "shift_name",
        "staff_id",
        "staff_name",
        "reason",
        "created_at",
      ])
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
          audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          action TEXT NOT NULL,
          year INTEGER NOT NULL,
          week_number INTEGER NOT NULL,
          shift_id INTEGER,
          shift_name TEXT,
          staff_id INTEGER,
          staff_name TEXT,
          reason TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

    addColumnIfMissing(database, "audit_log", "shift_id", "INTEGER");
    addColumnIfMissing(database, "audit_log", "shift_name", "TEXT");
    addColumnIfMissing(database, "audit_log", "staff_id", "INTEGER");
    addColumnIfMissing(database, "audit_log", "staff_name", "TEXT");
    addColumnIfMissing(database, "audit_log", "reason", "TEXT");
    if (addColumnIfMissing(database, "audit_log", "created_at", "TEXT")) {
      database.exec("UPDATE audit_log SET created_at = datetime('now') WHERE created_at IS NULL");
    }
  },
};
