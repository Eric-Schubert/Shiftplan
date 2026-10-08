import { addColumnIfMissing, hasMissingColumns, indexExists, tableExists } from "../schema.js";

export default {
  id: "004_main_page_visits_schema",
  description: "Create page visit analytics table",
  shouldRun(database) {
    return (
      !tableExists(database, "page_visits") ||
      hasMissingColumns(database, "page_visits", [
        "visit_date",
        "path",
        "visitor_hash",
        "user_agent",
        "referrer",
        "country_code",
        "region",
        "city",
        "created_at",
      ]) ||
      !indexExists(database, "idx_page_visits_date") ||
      !indexExists(database, "idx_page_visits_path_date") ||
      !indexExists(database, "idx_page_visits_visitor_date") ||
      !indexExists(database, "idx_page_visits_country_date")
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS page_visits (
          visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
          visit_date TEXT NOT NULL,
          path TEXT NOT NULL,
          visitor_hash TEXT NOT NULL,
          user_agent TEXT,
          referrer TEXT,
          country_code TEXT,
          region TEXT,
          city TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

    addColumnIfMissing(database, "page_visits", "visit_date", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(database, "page_visits", "path", "TEXT NOT NULL DEFAULT '/'");
    addColumnIfMissing(database, "page_visits", "visitor_hash", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(database, "page_visits", "user_agent", "TEXT");
    addColumnIfMissing(database, "page_visits", "referrer", "TEXT");
    addColumnIfMissing(database, "page_visits", "country_code", "TEXT");
    addColumnIfMissing(database, "page_visits", "region", "TEXT");
    addColumnIfMissing(database, "page_visits", "city", "TEXT");
    if (addColumnIfMissing(database, "page_visits", "created_at", "TEXT")) {
      database.exec("UPDATE page_visits SET created_at = datetime('now') WHERE created_at IS NULL");
    }

    database.exec("CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date)");
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_page_visits_path_date ON page_visits(path, visit_date)"
    );
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_page_visits_visitor_date ON page_visits(visit_date, visitor_hash)"
    );
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_page_visits_country_date ON page_visits(visit_date, country_code)"
    );
  },
};
