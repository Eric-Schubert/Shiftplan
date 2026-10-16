// @ts-check
import { addColumnIfMissing, hasMissingColumns } from "../schema.js";
import { assignMissingShortCodes } from "../staff-short-code.js";

/** @type {import("../runner.js").Migration} */
export default {
  id: "008_main_staff_short_code",
  description: "Short code for the personal sign-in with PIN",
  shouldRun(database) {
    return hasMissingColumns(database, "staff", ["short_code"]);
  },
  up(database) {
    addColumnIfMissing(database, "staff", "short_code", "TEXT");
    assignMissingShortCodes(database);
    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_short_code ON staff(short_code)");
  },
};
