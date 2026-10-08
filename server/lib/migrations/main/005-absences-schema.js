import { addColumnIfMissing, hasMissingColumns, indexExists, tableExists } from "../schema.js";

export default {
  id: "005_main_absences_schema",
  description: "Create day-level absences and audit source",
  shouldRun(database) {
    return (
      !tableExists(database, "absences") ||
      !indexExists(database, "idx_absences_active_staff_date") ||
      hasMissingColumns(database, "audit_log", ["source"])
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS absences (
          absence_id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          absence_date TEXT NOT NULL,
          shift_id INTEGER,
          reason TEXT CHECK(reason IS NULL OR reason IN ('krank', 'privat', 'sonstiges')),
          note TEXT,
          source TEXT NOT NULL DEFAULT 'web' CHECK(source IN ('web', 'app')),
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          cancelled_at TEXT,
          FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE SET NULL
        )
      `);
    database.exec("CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(absence_date)");
    database.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_absences_active_staff_date
        ON absences(staff_id, absence_date) WHERE cancelled_at IS NULL
      `);

    addColumnIfMissing(database, "audit_log", "source", "TEXT NOT NULL DEFAULT 'web'");
  },
};
