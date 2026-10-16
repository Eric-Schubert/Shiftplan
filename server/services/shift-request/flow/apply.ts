import { DayChangeService, applyDayChange, type DayChangeActor } from "~/server/services/day-change.service";
import { conflict, today } from "~/server/services/shift-request/common";
import { ShiftRequestService } from "~/server/services/shift-request/store";
import type { AppliedChange, ShiftRequest } from "~/server/services/shift-request/types";
import { getDatabase } from "~/server/utils/database";
import { apiError } from "~/server/utils/api-error";
import type { MessageKey } from "~/server/lib/i18n/translate";

/**
 * Runs a decision on the request as it is stored right now, inside one transaction: never on a copy
 * read before the request body arrived, and either every day change goes through or none.
 */
export function withCurrent<T>(request: ShiftRequest, change: (current: ShiftRequest) => T): T {
  return getDatabase().transaction(() => {
    const current = ShiftRequestService.getById(request.request_id);
    if (!current) throw apiError(null, 404, "errors.requests.notFound");
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
    const inPlan = DayChangeService.isInWeeklyPlan(change.staffId, change.shiftId, change.date);
    if (applyDayChange({ ...change, actor, note, requestId: request.request_id, origin })) {
      applied.push({ ...change, before, inPlan });
    }
  }
  return applied;
}

function exists(table: "staff" | "shifts", column: "staff_id" | "shift_id", id: number): boolean {
  return Boolean(getDatabase().prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`).get(id));
}

/** The cell no longer looks like the request left it: someone else changed the day or the weekly plan behind it. */
function moved(change: AppliedChange): boolean {
  if (ShiftRequestService.isPresent(change.staffId, change.shiftId, change.date) !== change.present) return true;
  if (change.inPlan === undefined) return false;
  return DayChangeService.isInWeeklyPlan(change.staffId, change.shiftId, change.date) !== change.inPlan;
}

/**
 * The recorded changes that can be put back: only days from today on, without shifts or people
 * deleted since. If anything else moved on (a later request, a planner edit), nothing is undone.
 */
export function revertableChanges(request: ShiftRequest, movedMessage: MessageKey): AppliedChange[] {
  const recorded = ShiftRequestService.appliedChanges(request.request_id);
  const first = today();
  const upcoming = recorded.filter((change) => change.date >= first);
  if (recorded.length > 0 && upcoming.length === 0) conflict("errors.requests.daysPassed");
  const changes = upcoming.filter(
    (change) => exists("staff", "staff_id", change.staffId) && exists("shifts", "shift_id", change.shiftId)
  );
  if (changes.some(moved)) conflict(movedMessage);
  return changes;
}

/** Puts every recorded day change of a finished request back to its earlier state. */
export function revertRequest(request: ShiftRequest, actor: DayChangeActor, movedMessage: MessageKey, origin?: string): void {
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
