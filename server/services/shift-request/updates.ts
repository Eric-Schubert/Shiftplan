import { getDatabase } from "~/server/utils/database";
import { conflict } from "~/server/services/shift-request/common";
import { getById } from "~/server/services/shift-request/queries";
import type { AppliedChange, ShiftRequest, ShiftRequestStatus } from "~/server/services/shift-request/types";

const STALE = "Die Anfrage wurde inzwischen schon bearbeitet";

/** Moves a request on, but only from the `expected` state, so a second click or a stale copy changes nothing. */
export function setStatus(
  requestId: number,
  status: ShiftRequestStatus,
  fields: {
    expected: ShiftRequestStatus;
    partnerStaffId?: number | null;
    decidedBy?: string;
    applied?: AppliedChange[];
    undoRequestedBy?: number | null;
  }
): ShiftRequest {
  const sets = ["status = ?", "decided_at = datetime('now')"];
  const values: unknown[] = [status];
  const optional: Array<[string, unknown]> = [
    ["partner_staff_id", fields.partnerStaffId],
    ["decided_by", fields.decidedBy],
    ["applied_changes", fields.applied === undefined ? undefined : JSON.stringify(fields.applied)],
    ["undo_requested_by", fields.undoRequestedBy],
  ];
  for (const [column, value] of optional) {
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    values.push(value);
  }
  const result = getDatabase()
    .prepare(`UPDATE shift_requests SET ${sets.join(", ")} WHERE request_id = ? AND status = ?`)
    .run(...values, requestId, fields.expected);
  if (result.changes === 0) conflict(STALE);
  return getById(requestId)!;
}

/** Marks who asked to undo a finished request, or clears the ask; `expected` is the ask seen before. */
export function setUndoRequest(requestId: number, staffId: number | null, expected: number | null): ShiftRequest {
  const result = getDatabase()
    .prepare(
      "UPDATE shift_requests SET undo_requested_by = ? WHERE request_id = ? AND status = 'done' AND undo_requested_by IS ?"
    )
    .run(staffId, requestId, expected);
  if (result.changes === 0) conflict(STALE);
  return getById(requestId)!;
}

/** Open takeovers that belonged to a withdrawn absence. */
export function cancelForAbsence(absenceIds: number[]): number {
  if (absenceIds.length === 0) return 0;
  return getDatabase()
    .prepare(
      `UPDATE shift_requests SET status = 'cancelled', decided_at = datetime('now')
        WHERE status IN ('open', 'pending_approval') AND absence_id IN (${absenceIds.map(() => "?").join(",")})`
    )
    .run(...absenceIds).changes;
}

/**
 * A deactivated person drops out of requests: a takeover they agreed to goes back to the team,
 * their own and their swaps are withdrawn, and undo asks with them are dropped.
 */
export function cancelForStaff(staffId: number): void {
  const db = getDatabase();
  db.transaction(() => {
    db.prepare(
      `UPDATE shift_requests SET status = 'open', partner_staff_id = NULL, decided_at = datetime('now')
        WHERE kind = 'takeover' AND status = 'pending_approval' AND partner_staff_id = ? AND requester_staff_id != ?`
    ).run(staffId, staffId);
    db.prepare(
      `UPDATE shift_requests SET status = 'cancelled', decided_at = datetime('now')
        WHERE status IN ('open', 'pending_approval') AND (requester_staff_id = ? OR partner_staff_id = ?)`
    ).run(staffId, staffId);
    db.prepare(
      `UPDATE shift_requests SET undo_requested_by = NULL
        WHERE status = 'done' AND undo_requested_by IS NOT NULL AND (requester_staff_id = ? OR partner_staff_id = ?)`
    ).run(staffId, staffId);
  })();
}
