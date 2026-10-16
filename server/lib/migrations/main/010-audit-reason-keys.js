// @ts-check
import { addColumnIfMissing, hasMissingColumns } from "../schema.js";

/** @type {import("../runner.js").Migration} */
export default {
  id: "010_main_audit_reason_keys",
  description: "Audit reasons as catalog key and JSON values, rendered in the reader's language",
  shouldRun(database) {
    return hasMissingColumns(database, "audit_log", ["reason_key", "reason_params"]);
  },
  up(database) {
    // Older entries keep only their German `reason` and are shown as written.
    addColumnIfMissing(database, "audit_log", "reason_key", "TEXT");
    addColumnIfMissing(database, "audit_log", "reason_params", "TEXT");
  },
};
