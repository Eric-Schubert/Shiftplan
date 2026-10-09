import { getDatabase } from "~/server/utils/database";
import { today } from "~/server/services/shift-request/common";
import { purgeOldMessages } from "~/server/services/shift-request/purge";
import type { AppliedChange, ShiftRequest, ShiftRequestStatus } from "~/server/services/shift-request/types";

const SELECT_REQUEST = `
  SELECT r.request_id, r.kind, r.status, r.requester_staff_id, rq.name AS requester_name,
         r.partner_staff_id, pt.name AS partner_name, r.shift_id, sh.name AS shift_name,
         r.date_from, r.date_to, r.message, r.created_at, r.decided_at, r.decided_by
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

export function listForPlanner(): ShiftRequest[] {
  purgeOldMessages();
  return getDatabase()
    .prepare(
      `${SELECT_REQUEST}
        WHERE r.status IN ('open', 'pending_approval') OR r.created_at >= datetime('now', '-30 days')
        ORDER BY CASE r.status WHEN 'pending_approval' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, r.date_from DESC`
    )
    .all() as ShiftRequest[];
}

export function setStatus(
  requestId: number,
  status: ShiftRequestStatus,
  fields: { partnerStaffId?: number; decidedBy?: string; applied?: AppliedChange[] } = {}
): ShiftRequest {
  const sets = ["status = ?", "decided_at = datetime('now')"];
  const values: unknown[] = [status];
  if (fields.partnerStaffId !== undefined) {
    sets.push("partner_staff_id = ?");
    values.push(fields.partnerStaffId);
  }
  if (fields.decidedBy !== undefined) {
    sets.push("decided_by = ?");
    values.push(fields.decidedBy);
  }
  if (fields.applied !== undefined) {
    sets.push("applied_changes = ?");
    values.push(JSON.stringify(fields.applied));
  }
  getDatabase()
    .prepare(`UPDATE shift_requests SET ${sets.join(", ")} WHERE request_id = ?`)
    .run(...values, requestId);
  return getById(requestId)!;
}

export function appliedChanges(requestId: number): AppliedChange[] {
  const row = getDatabase().prepare("SELECT applied_changes FROM shift_requests WHERE request_id = ?").get(requestId) as
    | { applied_changes: string | null }
    | undefined;
  return row?.applied_changes ? (JSON.parse(row.applied_changes) as AppliedChange[]) : [];
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
