import { ShiftRequestService, type AppliedChange, type ShiftRequest } from "~/server/services/shift-request.service";
import { conflict } from "~/server/services/shift-request/common";
import { getDatabase } from "~/server/utils/database";
import { applyDayChange, type DayChangeActor } from "~/server/utils/day-change-flow";

/**
 * Runs a decision on the request as it is stored right now, inside one transaction: never on a copy
 * read before the request body arrived, and either every day change goes through or none.
 */
export function withCurrent<T>(request: ShiftRequest, change: (current: ShiftRequest) => T): T {
  return getDatabase().transaction(() => {
    const current = ShiftRequestService.getById(request.request_id);
    if (!current) throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
    return change(current);
  })();
}

/** Applies the day changes of a request (only days from today on) and records them for a possible undo. */
export function applyRequest(request: ShiftRequest, actor: DayChangeActor, origin?: string): AppliedChange[] {
  const planned = ShiftRequestService.plannedChanges(request, request.partner_staff_id!);
  const note =
    request.kind === "takeover"
      ? `Übernahme für ${request.requester_name}`
      : `Tausch ${request.requester_name} ↔ ${request.partner_name}`;

  const applied: AppliedChange[] = [];
  for (const change of planned) {
    const before = ShiftRequestService.isPresent(change.staffId, change.shiftId, change.date);
    if (applyDayChange({ ...change, actor, note, requestId: request.request_id, origin })) {
      applied.push({ ...change, before });
    }
  }
  return applied;
}

function exists(table: "staff" | "shifts", column: "staff_id" | "shift_id", id: number): boolean {
  return Boolean(getDatabase().prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`).get(id));
}

/**
 * The recorded changes that can be put back. Shifts or people deleted since are skipped; if anything
 * else no longer looks like the request left it (a later request, a planner edit), nothing is undone.
 */
export function revertableChanges(request: ShiftRequest, movedMessage: string): AppliedChange[] {
  const changes = ShiftRequestService.appliedChanges(request.request_id).filter(
    (change) => exists("staff", "staff_id", change.staffId) && exists("shifts", "shift_id", change.shiftId)
  );
  const moved = changes.some(
    (change) => ShiftRequestService.isPresent(change.staffId, change.shiftId, change.date) !== change.present
  );
  if (moved) conflict(movedMessage);
  return changes;
}

/** Puts every recorded day change of a finished request back to its earlier state. */
export function revertRequest(request: ShiftRequest, actor: DayChangeActor, movedMessage: string, origin?: string): void {
  for (const change of revertableChanges(request, movedMessage).reverse()) {
    applyDayChange({
      staffId: change.staffId,
      shiftId: change.shiftId,
      date: change.date,
      present: change.before,
      actor,
      note: "Anfrage zurückgenommen",
      origin,
    });
  }
}
