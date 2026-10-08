import { addColumnIfMissing, hasMissingColumns, tableExists } from "../schema.js";

export default {
  id: "007_main_shift_requests",
  description: "Takeover and swap requests between staff",
  shouldRun(database) {
    return !tableExists(database, "shift_requests") || hasMissingColumns(database, "shift_day_changes", ["request_id"]);
  },
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS shift_requests (
          request_id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL CHECK(kind IN ('takeover', 'swap')),
          status TEXT NOT NULL DEFAULT 'open'
            CHECK(status IN ('open', 'pending_approval', 'done', 'declined', 'rejected', 'cancelled', 'reverted')),
          requester_staff_id INTEGER NOT NULL,
          partner_staff_id INTEGER,
          shift_id INTEGER,
          date_from TEXT NOT NULL,
          date_to TEXT NOT NULL,
          absence_id INTEGER,
          message TEXT,
          applied_changes TEXT,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          decided_at TEXT,
          decided_by TEXT,
          FOREIGN KEY (requester_staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (partner_staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE
        )
      `);
    database.exec("CREATE INDEX IF NOT EXISTS idx_shift_requests_status ON shift_requests(status, date_from)");
    // Day changes made by a request, so a planner can undo exactly those.
    addColumnIfMissing(database, "shift_day_changes", "request_id", "INTEGER");
  },
};
