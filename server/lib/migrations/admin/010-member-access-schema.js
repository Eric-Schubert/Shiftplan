import { addColumnIfMissing, hasMissingColumns, tableExists } from "../schema.js";

export default {
  id: "010_admin_member_access_schema",
  description: "Create personal app invites, member sessions and app planner sessions",
  shouldRun(database) {
    return (
      !tableExists(database, "member_invites") ||
      !tableExists(database, "member_sessions") ||
      hasMissingColumns(database, "push_devices", ["member_session"]) ||
      hasMissingColumns(database, "auth_sessions", ["client"])
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS member_invites (
          invite_id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          code_hash TEXT NOT NULL UNIQUE,
          created_by TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          used_at INTEGER
        )
      `);

    database.exec(`
        CREATE TABLE IF NOT EXISTS member_sessions (
          session_id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          staff_id INTEGER NOT NULL,
          device_name TEXT,
          created_at INTEGER NOT NULL,
          last_seen_at INTEGER NOT NULL,
          revoked_at INTEGER
        )
      `);
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_member_sessions_staff ON member_sessions(staff_id)"
    );

    addColumnIfMissing(database, "push_devices", "member_session", "TEXT");
    addColumnIfMissing(database, "auth_sessions", "client", "TEXT NOT NULL DEFAULT 'web'");
  },
};
