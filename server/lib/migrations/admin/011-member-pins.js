import { addColumnIfMissing, hasMissingColumns, tableExists } from "../schema.js";

export default {
  id: "011_admin_member_pins",
  description: "Personal PIN per staff member and personal browser push",
  shouldRun(database) {
    return !tableExists(database, "member_pins") || hasMissingColumns(database, "push_subscriptions", ["staff_id"]);
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS member_pins (
          staff_id INTEGER PRIMARY KEY,
          pin_hash TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
    // Browsers signed in as a person also get the personal messages of that person.
    addColumnIfMissing(database, "push_subscriptions", "staff_id", "INTEGER");
  },
};
