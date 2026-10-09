import { addColumnIfMissing, hasMissingColumns } from "../schema.js";

export default {
  id: "012_admin_push_subscription_session",
  description: "Bind personal browser push subscriptions to their sign-in",
  shouldRun(database) {
    return hasMissingColumns(database, "push_subscriptions", ["member_session"]);
  },
  up(database) {
    addColumnIfMissing(database, "push_subscriptions", "member_session", "TEXT");
    // Older personal subscriptions cannot be traced to a sign-in, so signing out could not
    // remove them. The browser registers again on its next visit.
    database.exec("DELETE FROM push_subscriptions WHERE staff_id IS NOT NULL");
  },
};
