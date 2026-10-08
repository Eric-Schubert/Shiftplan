import { addColumnIfMissing, hasMissingColumns, indexExists, tableExists } from "../schema.js";

export default {
  id: "004_admin_auth_state_schema",
  description: "Create persistent auth session and login throttle tables",
  shouldRun(database) {
    return (
      !tableExists(database, "auth_sessions") ||
      !tableExists(database, "login_rate_limits") ||
      hasMissingColumns(database, "auth_sessions", [
        "session_token",
        "user_id",
        "username",
        "role",
        "csrf_token",
        "created_at",
        "expires_at",
        "last_activity",
      ]) ||
      hasMissingColumns(database, "login_rate_limits", [
        "ip",
        "count",
        "first_attempt",
        "blocked_until",
      ]) ||
      !indexExists(database, "idx_auth_sessions_expires_at") ||
      !indexExists(database, "idx_login_rate_limits_blocked_until")
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          session_token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'planner')),
          csrf_token TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          last_activity INTEGER NOT NULL
        )
      `);

    addColumnIfMissing(database, "auth_sessions", "user_id", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "auth_sessions", "username", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(database, "auth_sessions", "role", "TEXT NOT NULL DEFAULT 'planner'");
    addColumnIfMissing(database, "auth_sessions", "csrf_token", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(database, "auth_sessions", "created_at", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "auth_sessions", "expires_at", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "auth_sessions", "last_activity", "INTEGER NOT NULL DEFAULT 0");
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)"
    );

    database.exec(`
        CREATE TABLE IF NOT EXISTS login_rate_limits (
          ip TEXT PRIMARY KEY,
          count INTEGER NOT NULL DEFAULT 0,
          first_attempt INTEGER NOT NULL DEFAULT 0,
          blocked_until INTEGER
        )
      `);

    addColumnIfMissing(database, "login_rate_limits", "count", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "login_rate_limits", "first_attempt", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "login_rate_limits", "blocked_until", "INTEGER");
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_login_rate_limits_blocked_until ON login_rate_limits(blocked_until)"
    );
  },
};
