import { tableExists } from "../schema.js";

export default {
  id: "001_admin_settings_schema",
  description: "Create settings table",
  shouldRun(database) {
    return !tableExists(database, "settings");
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);
  },
};
