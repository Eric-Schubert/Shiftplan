import { addColumnIfMissing, hasMissingColumns, indexExists, tableExists } from "../schema.js";

export default {
  id: "007_admin_contact_messages_schema",
  description: "Create contact message inbox",
  shouldRun(database) {
    return (
      !tableExists(database, "contact_messages") ||
      hasMissingColumns(database, "contact_messages", [
        "name",
        "reply_to",
        "subject",
        "message",
        "ip_hash",
        "user_agent",
        "created_at",
        "read_at",
      ]) ||
      !indexExists(database, "idx_contact_messages_created_at") ||
      !indexExists(database, "idx_contact_messages_read_at")
    );
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS contact_messages (
          contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          reply_to TEXT NOT NULL,
          subject TEXT,
          message TEXT NOT NULL,
          ip_hash TEXT,
          user_agent TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          read_at TEXT
        )
      `);

    addColumnIfMissing(database, "contact_messages", "name", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(database, "contact_messages", "reply_to", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(database, "contact_messages", "subject", "TEXT");
    addColumnIfMissing(database, "contact_messages", "message", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(database, "contact_messages", "ip_hash", "TEXT");
    addColumnIfMissing(database, "contact_messages", "user_agent", "TEXT");
    if (addColumnIfMissing(database, "contact_messages", "created_at", "TEXT")) {
      database.exec("UPDATE contact_messages SET created_at = datetime('now') WHERE created_at IS NULL");
    }
    addColumnIfMissing(database, "contact_messages", "read_at", "TEXT");

    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at)"
    );
    database.exec(
      "CREATE INDEX IF NOT EXISTS idx_contact_messages_read_at ON contact_messages(read_at)"
    );
  },
};
