import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import { DayChangeService } from "~/server/services/day-change.service";
import { datesBetween, parseISODate } from "~/server/utils/iso-week";

export type ShiftRequestKind = "takeover" | "swap";
export type ShiftRequestStatus =
  | "open"
  | "pending_approval"
  | "done"
  | "declined"
  | "rejected"
  | "cancelled"
  | "reverted";

export type ShiftRequest = {
  request_id: number;
  kind: ShiftRequestKind;
  status: ShiftRequestStatus;
  requester_staff_id: number;
  requester_name: string;
  partner_staff_id: number | null;
  partner_name: string | null;
  shift_id: number | null;
  shift_name: string | null;
  date_from: string;
  date_to: string;
  message: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

/** One applied day change and the state before it, so a planner can undo the request. */
export type AppliedChange = { staffId: number; shiftId: number; date: string; present: boolean; before: boolean };

export const SWAP_MAX_DAYS = 56;
export const REQUEST_MESSAGE_MAX_LENGTH = 160;
const APPROVAL_SETTING = "requests_require_approval";

const SELECT_REQUEST = `
  SELECT r.request_id, r.kind, r.status, r.requester_staff_id, rq.name AS requester_name,
         r.partner_staff_id, pt.name AS partner_name, r.shift_id, sh.name AS shift_name,
         r.date_from, r.date_to, r.message, r.created_at, r.decided_at, r.decided_by
  FROM shift_requests r
  JOIN staff rq ON rq.staff_id = r.requester_staff_id
  LEFT JOIN staff pt ON pt.staff_id = r.partner_staff_id
  LEFT JOIN shifts sh ON sh.shift_id = r.shift_id
`;

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message });
}

function conflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isAbsent(staffId: number, date: string): boolean {
  return Boolean(
    getDatabase()
      .prepare("SELECT 1 FROM absences WHERE staff_id = ? AND absence_date = ? AND cancelled_at IS NULL")
      .get(staffId, date)
  );
}

function activeStaffName(staffId: number): string | null {
  const row = getDatabase().prepare("SELECT name FROM staff WHERE staff_id = ? AND active = 1").get(staffId) as
    | { name: string }
    | undefined;
  return row?.name ?? null;
}

/**
 * Takeover and swap requests between staff. The weekly plan stays untouched; a request
 * that goes through becomes day-level changes for the people involved.
 */
export const ShiftRequestService = {
  requiresApproval(): boolean {
    const row = getAdminDatabase().prepare("SELECT value FROM settings WHERE key = ?").get(APPROVAL_SETTING) as
      | { value: string }
      | undefined;
    return row?.value === "1";
  },

  setRequiresApproval(required: boolean): void {
    getAdminDatabase()
      .prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
      .run(APPROVAL_SETTING, required ? "1" : "0");
  },

  getById(requestId: number): ShiftRequest | undefined {
    return getDatabase().prepare(`${SELECT_REQUEST} WHERE r.request_id = ?`).get(requestId) as ShiftRequest | undefined;
  },

  /** What a staff member sees: open takeovers of the team plus everything they are part of. */
  listForMember(staffId: number): ShiftRequest[] {
    return getDatabase()
      .prepare(
        `${SELECT_REQUEST}
          WHERE r.date_to >= ?
            AND ((r.kind = 'takeover' AND r.status = 'open')
                 OR r.requester_staff_id = ? OR r.partner_staff_id = ?)
          ORDER BY r.date_from, r.request_id`
      )
      .all(today(), staffId, staffId) as ShiftRequest[];
  },

  listForPlanner(): ShiftRequest[] {
    return getDatabase()
      .prepare(
        `${SELECT_REQUEST}
          WHERE r.status IN ('open', 'pending_approval') OR r.created_at >= datetime('now', '-30 days')
          ORDER BY CASE r.status WHEN 'pending_approval' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, r.date_from DESC`
      )
      .all() as ShiftRequest[];
  },

  createTakeover(input: {
    staffId: number;
    date: string;
    shiftId?: number | null;
    message?: string | null;
    absenceId?: number | null;
    createdBy: string;
  }): ShiftRequest {
    if (!parseISODate(input.date)) badRequest("Ungültiges Datum");
    if (input.date < today()) badRequest("Der Tag liegt in der Vergangenheit");
    const shifts = DayChangeService.shiftsOnDate(input.staffId, input.date);
    if (shifts.length === 0) badRequest("An diesem Tag hast du keine Schicht");
    const shiftId = input.shiftId ?? (shifts.length === 1 ? shifts[0]!.shift_id : null);
    if (shiftId === null) badRequest("Bitte die Schicht wählen");
    if (!shifts.some((shift) => shift.shift_id === shiftId)) badRequest("Diese Schicht hast du an dem Tag nicht");

    const db = getDatabase();
    const existing = db
      .prepare(
        `SELECT 1 FROM shift_requests
          WHERE kind = 'takeover' AND requester_staff_id = ? AND shift_id = ? AND date_from = ?
            AND status IN ('open', 'pending_approval')`
      )
      .get(input.staffId, shiftId, input.date);
    if (existing) conflict("Für diese Schicht läuft schon eine Anfrage");

    const result = db
      .prepare(
        `INSERT INTO shift_requests (kind, requester_staff_id, shift_id, date_from, date_to, absence_id, message, created_by)
         VALUES ('takeover', ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(input.staffId, shiftId, input.date, input.date, input.absenceId ?? null, input.message?.trim() || null, input.createdBy);
    return this.getById(result.lastInsertRowid as number)!;
  },

  createSwap(input: {
    staffId: number;
    partnerStaffId: number;
    from: string;
    to: string;
    message?: string | null;
    createdBy: string;
  }): ShiftRequest {
    if (input.partnerStaffId === input.staffId) badRequest("Tauschen geht nur mit jemand anderem");
    if (!activeStaffName(input.partnerStaffId)) badRequest("Unbekannte Kollegin oder unbekannter Kollege");
    const dates = datesBetween(input.from, input.to, SWAP_MAX_DAYS);
    if (!dates) badRequest(`Ungültiger Zeitraum (höchstens ${SWAP_MAX_DAYS / 7} Wochen)`);
    if (input.from < today()) badRequest("Der Zeitraum liegt in der Vergangenheit");
    if (this.swapChanges(input.staffId, input.partnerStaffId, dates).length === 0) {
      badRequest("Im Zeitraum gibt es nichts zu tauschen");
    }

    const result = getDatabase()
      .prepare(
        `INSERT INTO shift_requests (kind, requester_staff_id, partner_staff_id, date_from, date_to, message, created_by)
         VALUES ('swap', ?, ?, ?, ?, ?, ?)`
      )
      .run(input.staffId, input.partnerStaffId, input.from, input.to, input.message?.trim() || null, input.createdBy);
    return this.getById(result.lastInsertRowid as number)!;
  },

  /** Day changes that swap all shifts of two people in a range. Shared shifts stay as they are. */
  swapChanges(staffA: number, staffB: number, dates: string[]): Array<Omit<AppliedChange, "before">> {
    const changes: Array<Omit<AppliedChange, "before">> = [];
    for (const date of dates) {
      const shiftsA = new Set(DayChangeService.shiftsOnDate(staffA, date).map((shift) => shift.shift_id));
      const shiftsB = new Set(DayChangeService.shiftsOnDate(staffB, date).map((shift) => shift.shift_id));
      for (const shiftId of shiftsA) {
        if (shiftsB.has(shiftId)) continue;
        changes.push({ staffId: staffA, shiftId, date, present: false }, { staffId: staffB, shiftId, date, present: true });
      }
      for (const shiftId of shiftsB) {
        if (shiftsA.has(shiftId)) continue;
        changes.push({ staffId: staffB, shiftId, date, present: false }, { staffId: staffA, shiftId, date, present: true });
      }
    }
    return changes;
  },

  /** Day changes of a takeover: the requester leaves the shift, the helper leaves their own and joins it. */
  takeoverChanges(request: ShiftRequest, helperId: number): Array<Omit<AppliedChange, "before">> {
    const date = request.date_from;
    const shiftId = request.shift_id!;
    const changes: Array<Omit<AppliedChange, "before">> = [
      { staffId: request.requester_staff_id, shiftId, date, present: false },
    ];
    for (const own of DayChangeService.shiftsOnDate(helperId, date)) {
      if (own.shift_id !== shiftId) changes.push({ staffId: helperId, shiftId: own.shift_id, date, present: false });
    }
    changes.push({ staffId: helperId, shiftId, date, present: true });
    return changes;
  },

  /** A colleague says yes. Throws if the request can no longer be accepted by them. */
  checkAccept(request: ShiftRequest, staffId: number): void {
    if (request.status !== "open") conflict("Die Anfrage ist nicht mehr offen");
    if (request.date_to < today()) conflict("Die Anfrage ist abgelaufen");
    if (request.kind === "swap") {
      if (request.partner_staff_id !== staffId) throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
      return;
    }
    if (request.requester_staff_id === staffId) badRequest("Die eigene Schicht kannst du nicht übernehmen");
    if (isAbsent(staffId, request.date_from)) badRequest("An dem Tag hast du selbst einen Ausfall eingetragen");
    const already = DayChangeService.shiftsOnDate(staffId, request.date_from).some(
      (shift) => shift.shift_id === request.shift_id
    );
    if (already) badRequest("Du bist an dem Tag schon in dieser Schicht");
  },

  setStatus(
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
    return this.getById(requestId)!;
  },

  appliedChanges(requestId: number): AppliedChange[] {
    const row = getDatabase().prepare("SELECT applied_changes FROM shift_requests WHERE request_id = ?").get(requestId) as
      | { applied_changes: string | null }
      | undefined;
    return row?.applied_changes ? (JSON.parse(row.applied_changes) as AppliedChange[]) : [];
  },

  /** Open takeovers that belonged to a withdrawn absence. */
  cancelForAbsence(absenceIds: number[]): number {
    if (absenceIds.length === 0) return 0;
    return getDatabase()
      .prepare(
        `UPDATE shift_requests SET status = 'cancelled', decided_at = datetime('now')
          WHERE status IN ('open', 'pending_approval') AND absence_id IN (${absenceIds.map(() => "?").join(",")})`
      )
      .run(...absenceIds).changes;
  },

  isPresent(staffId: number, shiftId: number, date: string): boolean {
    return DayChangeService.shiftsOnDate(staffId, date).some((shift) => shift.shift_id === shiftId);
  },
};
