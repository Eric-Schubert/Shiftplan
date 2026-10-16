// @ts-check
import { addColumnIfMissing, hasMissingColumns } from "../schema.js";

/** @type {import("../runner.js").Migration} */
export default {
  id: "013_admin_push_locale",
  description: "Remember the language of push subscriptions and app devices",
  shouldRun(database) {
    return hasMissingColumns(database, "push_subscriptions", ["locale"]) || hasMissingColumns(database, "push_devices", ["locale"]);
  },
  up(database) {
    // Pushes are written in each recipient's language. Everything registered before got German,
    // the only language so far, and keeps it until the browser or app registers again.
    addColumnIfMissing(database, "push_subscriptions", "locale", "TEXT NOT NULL DEFAULT 'de'");
    addColumnIfMissing(database, "push_devices", "locale", "TEXT NOT NULL DEFAULT 'de'");
  },
};
