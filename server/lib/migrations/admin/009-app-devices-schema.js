import { tableExists } from "../schema.js";

export default {
  id: "009_admin_app_devices_schema",
  description: "Create native app push device table",
  shouldRun(database) {
    return !tableExists(database, "push_devices");
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS push_devices (
          device_id INTEGER PRIMARY KEY AUTOINCREMENT,
          platform TEXT NOT NULL CHECK(platform IN ('ios', 'android')),
          token TEXT NOT NULL UNIQUE,
          staff_id INTEGER,
          scope TEXT NOT NULL DEFAULT 'all' CHECK(scope IN ('all', 'mine')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
  },
};
