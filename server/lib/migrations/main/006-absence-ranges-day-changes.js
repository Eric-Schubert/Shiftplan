import { hasMissingColumns, tableExists } from "../schema.js";

export default {
  id: "006_main_absence_ranges_day_changes",
  description: "Vacation reasons, absence ranges and day-level shift changes",
  shouldRun(database) {
    const absences = database
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'absences'")
      .get();
    return (
      !absences ||
      absences.sql.includes("'krank'") ||
      hasMissingColumns(database, "absences", ["batch_id"]) ||
      !tableExists(database, "shift_day_changes")
    );
  },
  up(database) {
    // SQLite cannot change a CHECK constraint, so the table is rebuilt.
    database.exec(`
        CREATE TABLE absences_new (
          absence_id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          absence_date TEXT NOT NULL,
          shift_id INTEGER,
          reason TEXT CHECK(reason IS NULL OR reason IN ('urlaub', 'privat', 'sonstiges')),
          note TEXT,
          batch_id TEXT,
          source TEXT NOT NULL DEFAULT 'web' CHECK(source IN ('web', 'app')),
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          cancelled_at TEXT,
          FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE SET NULL
        )
      `);
    if (tableExists(database, "absences")) {
      database.exec(`
          INSERT INTO absences_new (absence_id, staff_id, absence_date, shift_id, reason, note,
                                    source, created_by, created_at, cancelled_at)
          SELECT absence_id, staff_id, absence_date, shift_id,
                 CASE WHEN reason = 'krank' THEN 'sonstiges' ELSE reason END,
                 note, source, created_by, created_at, cancelled_at
          FROM absences
        `);
      database.exec("DROP TABLE absences");
    }
    database.exec("ALTER TABLE absences_new RENAME TO absences");
    database.exec("CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(absence_date)");
    database.exec("CREATE INDEX IF NOT EXISTS idx_absences_batch ON absences(batch_id)");
    database.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_absences_active_staff_date
        ON absences(staff_id, absence_date) WHERE cancelled_at IS NULL
      `);

    // Day-level exceptions on top of the weekly plan: someone joins or leaves a shift for one day.
    database.exec(`
        CREATE TABLE IF NOT EXISTS shift_day_changes (
          change_id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          shift_id INTEGER NOT NULL,
          change_date TEXT NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('add', 'remove')),
          source TEXT NOT NULL DEFAULT 'web' CHECK(source IN ('web', 'app')),
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE,
          UNIQUE(staff_id, shift_id, change_date)
        )
      `);
    database.exec("CREATE INDEX IF NOT EXISTS idx_shift_day_changes_date ON shift_day_changes(change_date)");
  },
};
