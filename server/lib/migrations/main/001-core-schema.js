import { addColumnIfMissing, hasMissingColumns, indexExists, tableExists } from "../schema.js";
import { DEFAULT_SHIFT_COLOR, DEFAULT_SHIFT_MIN_STAFF, DEFAULT_SHIFT_SORT_ORDER } from "../config.js";

export default {
  id: "001_main_core_schema",
  description: "Create and normalize core planning tables",
  shouldRun(database) {
    return (
      !tableExists(database, "staff") ||
      !tableExists(database, "shifts") ||
      !tableExists(database, "weeks") ||
      !tableExists(database, "shift_assignments") ||
      hasMissingColumns(database, "staff", ["active", "is_parttime"]) ||
      hasMissingColumns(database, "shifts", ["active", "color", "min_staff", "sort_order"]) ||
      !indexExists(database, "idx_weeks_year_week_number") ||
      !indexExists(database, "idx_shift_assignments_unique")
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS staff (
          staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
          active INTEGER NOT NULL DEFAULT 1,
          name TEXT NOT NULL,
          is_parttime INTEGER NOT NULL DEFAULT 0
        )
      `);

    addColumnIfMissing(database, "staff", "active", "INTEGER NOT NULL DEFAULT 1");
    addColumnIfMissing(database, "staff", "is_parttime", "INTEGER NOT NULL DEFAULT 0");
    database.exec("UPDATE staff SET active = 1 WHERE active IS NULL");
    database.exec("UPDATE staff SET is_parttime = 0 WHERE is_parttime IS NULL");

    database.exec(`
        CREATE TABLE IF NOT EXISTS shifts (
          shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          color TEXT DEFAULT '${DEFAULT_SHIFT_COLOR}',
          min_staff INTEGER NOT NULL DEFAULT ${DEFAULT_SHIFT_MIN_STAFF},
          sort_order INTEGER NOT NULL DEFAULT ${DEFAULT_SHIFT_SORT_ORDER}
        )
      `);

    addColumnIfMissing(database, "shifts", "active", "INTEGER NOT NULL DEFAULT 1");
    addColumnIfMissing(database, "shifts", "color", `TEXT DEFAULT '${DEFAULT_SHIFT_COLOR}'`);
    addColumnIfMissing(database, "shifts", "min_staff", `INTEGER NOT NULL DEFAULT ${DEFAULT_SHIFT_MIN_STAFF}`);
    addColumnIfMissing(database, "shifts", "sort_order", `INTEGER NOT NULL DEFAULT ${DEFAULT_SHIFT_SORT_ORDER}`);
    database.exec("UPDATE shifts SET active = 1 WHERE active IS NULL");
    database.prepare("UPDATE shifts SET color = ? WHERE color IS NULL OR color = ''").run(DEFAULT_SHIFT_COLOR);
    database.prepare("UPDATE shifts SET min_staff = ? WHERE min_staff IS NULL").run(DEFAULT_SHIFT_MIN_STAFF);
    database.prepare("UPDATE shifts SET sort_order = ? WHERE sort_order IS NULL").run(DEFAULT_SHIFT_SORT_ORDER);

    database.exec(`
        CREATE TABLE IF NOT EXISTS weeks (
          week_id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL,
          week_number INTEGER NOT NULL,
          UNIQUE(year, week_number)
        )
      `);
    database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_weeks_year_week_number ON weeks(year, week_number)"
    );

    database.exec(`
        CREATE TABLE IF NOT EXISTS shift_assignments (
          assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          shift_id INTEGER NOT NULL,
          week_id INTEGER NOT NULL,
          FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE,
          FOREIGN KEY (week_id) REFERENCES weeks(week_id) ON DELETE CASCADE,
          UNIQUE(staff_id, shift_id, week_id)
        )
      `);
    database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_assignments_unique ON shift_assignments(staff_id, shift_id, week_id)"
    );
  },
};
