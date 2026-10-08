import { tableExists } from "../schema.js";
import { DEFAULT_ADMIN_USERNAME } from "../config.js";
import { requireBootstrapPasswordHash } from "../admin-credentials.js";

export default {
  id: "003_admin_bootstrap_user",
  description: "Seed admin user from legacy settings or bootstrap password",
  shouldRun(database) {
    if (!tableExists(database, "users")) return true;
    const existingUsers = database.prepare("SELECT COUNT(*) AS count FROM users").get();
    return existingUsers.count === 0;
  },
  up(database, options) {
    const passwordHash = requireBootstrapPasswordHash(
      database,
      options,
      "Kein Admin-Benutzer vorhanden."
    );

    database
      .prepare(
        "INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, 'admin', 1, datetime('now'))"
      )
      .run(DEFAULT_ADMIN_USERNAME, passwordHash);
  },
};
