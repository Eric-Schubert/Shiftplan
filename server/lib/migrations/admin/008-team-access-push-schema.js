import { indexExists, tableExists } from "../schema.js";

export default {
  id: "008_admin_team_access_push_schema",
  description: "Create team viewer sessions and push subscriptions",
  shouldRun(database) {
    return (
      !tableExists(database, "viewer_sessions") ||
      !tableExists(database, "push_subscriptions") ||
      !indexExists(database, "idx_viewer_sessions_expires_at")
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS viewer_sessions (
          session_token TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        )
      `);
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_viewer_sessions_expires_at ON viewer_sessions(expires_at)"
    );

    database.exec(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
  },
};
