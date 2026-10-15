import { getDatabase } from "~/server/utils/database";
import { today } from "~/server/services/shift-request/common";
import { purgeOldMessages } from "~/server/services/shift-request/purge";
import type { AppliedChange, ShiftRequest } from "~/server/services/shift-request/types";

// Finished requests stay in the planner list this long after the decision, or until their last day.
const RECENT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const SELECT_REQUEST = `
  SELECT r.request_id, r.kind, r.status, r.requester_staff_id, rq.name AS requester_name,
         r.partner_staff_id, pt.name AS partner_name, r.shift_id, sh.name AS shift_name,
         r.date_from, r.date_to, r.message, r.created_at, r.decided_at, r.decided_by,
         r.undo_requested_by
  FROM shift_requests r
  JOIN staff rq ON rq.staff_id = r.requester_staff_id
  LEFT JOIN staff pt ON pt.staff_id = r.partner_staff_id
  LEFT JOIN shifts sh ON sh.shift_id = r.shift_id
`;

export function getById(requestId: number): ShiftRequest | undefined {
  return getDatabase().prepare(`${SELECT_REQUEST} WHERE r.request_id = ?`).get(requestId) as ShiftRequest | undefined;
}

/** What a staff member sees: open takeovers of the team plus everything they are part of. */
export function listForMember(staffId: number): ShiftRequest[] {
  purgeOldMessages();
  clearStaleUndoAsks();
  return getDatabase()
    .prepare(
      `${SELECT_REQUEST}
        WHERE r.date_to >= ?
          AND ((r.kind = 'takeover' AND r.status = 'open')
               OR r.requester_staff_id = ? OR r.partner_staff_id = ?)
        ORDER BY r.date_from, r.request_id`
    )
    .all(today(), staffId, staffId) as ShiftRequest[];
}

/** Everything not over yet, plus what was decided recently. Expired open requests can no longer be taken up. */
export function listForPlanner(now = Date.now()): ShiftRequest[] {
  purgeOldMessages();
  clearStaleUndoAsks();
  const recent = new Date(now - RECENT_DAYS * DAY_MS).toISOString().replace("T", " ").slice(0, 19);
  return getDatabase()
    .prepare(
      `${SELECT_REQUEST}
        WHERE r.date_to >= ?
           OR (r.status NOT IN ('open', 'pending_approval') AND COALESCE(r.decided_at, r.created_at) >= ?)
        ORDER BY CASE r.status WHEN 'pending_approval' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, r.date_from DESC`
    )
    .all(today(), recent) as ShiftRequest[];
}

/** An undo can only be confirmed until the day before, so later asks are dropped. */
function clearStaleUndoAsks(): void {
  getDatabase()
    .prepare(
      "UPDATE shift_requests SET undo_requested_by = NULL WHERE status = 'done' AND undo_requested_by IS NOT NULL AND date_from <= ?"
    )
    .run(today());
}

export function appliedChanges(requestId: number): AppliedChange[] {
  const row = getDatabase().prepare("SELECT applied_changes FROM shift_requests WHERE request_id = ?").get(requestId) as
    | { applied_changes: string | null }
    | undefined;
  return row?.applied_changes ? (JSON.parse(row.applied_changes) as AppliedChange[]) : [];
}
