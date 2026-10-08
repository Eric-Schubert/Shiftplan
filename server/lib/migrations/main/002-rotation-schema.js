import { addColumnIfMissing, hasMissingColumns, indexExists, tableExists } from "../schema.js";
import { DEFAULT_ROTATION_CYCLE_LENGTH, DEFAULT_ROTATION_START_WEEK } from "../config.js";

export default {
  id: "002_main_rotation_schema",
  description: "Create and normalize rotation tables",
  shouldRun(database) {
    return (
      !tableExists(database, "rotation_config") ||
      !tableExists(database, "rotation_pattern") ||
      hasMissingColumns(database, "rotation_config", ["cycle_length", "start_year", "start_week"]) ||
      !indexExists(database, "idx_rotation_pattern_unique")
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS rotation_config (
          config_id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle_length INTEGER NOT NULL DEFAULT ${DEFAULT_ROTATION_CYCLE_LENGTH},
          start_year INTEGER NOT NULL,
          start_week INTEGER NOT NULL DEFAULT ${DEFAULT_ROTATION_START_WEEK}
        )
      `);

    addColumnIfMissing(
      database,
      "rotation_config",
      "cycle_length",
      `INTEGER NOT NULL DEFAULT ${DEFAULT_ROTATION_CYCLE_LENGTH}`
    );
    addColumnIfMissing(database, "rotation_config", "start_year", "INTEGER");
    addColumnIfMissing(database, "rotation_config", "start_week", "INTEGER");
    database
      .prepare("UPDATE rotation_config SET cycle_length = ? WHERE cycle_length IS NULL")
      .run(DEFAULT_ROTATION_CYCLE_LENGTH);
    database.exec(
      "UPDATE rotation_config SET start_year = CAST(strftime('%Y', 'now') AS INTEGER) WHERE start_year IS NULL"
    );
    database
      .prepare("UPDATE rotation_config SET start_week = ? WHERE start_week IS NULL")
      .run(DEFAULT_ROTATION_START_WEEK);

    database.exec(`
        CREATE TABLE IF NOT EXISTS rotation_pattern (
          pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern_week INTEGER NOT NULL,
          staff_id INTEGER NOT NULL,
          shift_id INTEGER NOT NULL,
          FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE,
          UNIQUE(pattern_week, staff_id, shift_id)
        )
      `);
    database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_rotation_pattern_unique ON rotation_pattern(pattern_week, staff_id, shift_id)"
    );
  },
};
