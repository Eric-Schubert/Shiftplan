import { addColumnIfMissing, hasMissingColumns, indexExists, tableExists } from "../schema.js";
import { requireBootstrapPasswordHash } from "../admin-credentials.js";

function getMissingPasswordHashCount(database) {
  if (!tableExists(database, "users")) return 0;
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM users WHERE password_hash IS NULL OR password_hash = ''")
    .get();
  return row?.count || 0;
}

export default {
  id: "002_admin_users_schema",
  description: "Create and normalize users table",
  shouldRun(database) {
    return (
      !tableExists(database, "users") ||
      hasMissingColumns(database, "users", ["username", "password_hash", "role", "active", "created_at"]) ||
      !indexExists(database, "idx_users_username")
    );
  },
  up(database, options) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          user_id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'planner' CHECK(role IN ('admin', 'planner')),
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

    addColumnIfMissing(database, "users", "password_hash", "TEXT");
    addColumnIfMissing(database, "users", "role", "TEXT NOT NULL DEFAULT 'admin'");
    addColumnIfMissing(database, "users", "active", "INTEGER NOT NULL DEFAULT 1");
    if (addColumnIfMissing(database, "users", "created_at", "TEXT")) {
      database.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL");
    }

    database.exec("UPDATE users SET role = 'admin' WHERE role IS NULL OR role = ''");
    database.exec("UPDATE users SET active = 1 WHERE active IS NULL");
    database.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL");

    const missingPasswordHashCount = getMissingPasswordHashCount(database);
    if (missingPasswordHashCount > 0) {
      const fallbackPasswordHash = requireBootstrapPasswordHash(
        database,
        options,
        "Es existieren Benutzer ohne Passwort-Hash."
      );
      database
        .prepare("UPDATE users SET password_hash = ? WHERE password_hash IS NULL OR password_hash = ''")
        .run(fallbackPasswordHash);
    }

    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
  },
};
