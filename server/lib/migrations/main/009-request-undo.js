import { addColumnIfMissing, hasMissingColumns } from "../schema.js";

export default {
  id: "009_main_request_undo",
  description: "Staff can ask to undo a finished request, the other person confirms",
  shouldRun(database) {
    return hasMissingColumns(database, "shift_requests", ["undo_requested_by"]);
  },
  up(database) {
    addColumnIfMissing(database, "shift_requests", "undo_requested_by", "INTEGER");
  },
};
