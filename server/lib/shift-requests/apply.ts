import {
  SWAP_MAX_DAYS,
  ShiftRequestService,
  type AppliedChange,
  type ShiftRequest,
} from "~/server/services/shift-request.service";
import { applyDayChange, type DayChangeActor } from "~/server/utils/day-change-flow";
import { datesBetween } from "~/server/utils/iso-week";

/** Applies the day changes of a request and records them for a possible undo. */
export function applyRequest(request: ShiftRequest, actor: DayChangeActor, origin?: string): AppliedChange[] {
  const planned =
    request.kind === "takeover"
      ? ShiftRequestService.takeoverChanges(request, request.partner_staff_id!)
      : ShiftRequestService.swapChanges(
          request.requester_staff_id,
          request.partner_staff_id!,
          datesBetween(request.date_from, request.date_to, SWAP_MAX_DAYS) ?? []
        );
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

/** Puts every recorded day change of a finished request back to its earlier state. */
export function revertRequest(request: ShiftRequest, actor: DayChangeActor, origin?: string): void {
  const changes = ShiftRequestService.appliedChanges(request.request_id).reverse();
  for (const change of changes) {
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
