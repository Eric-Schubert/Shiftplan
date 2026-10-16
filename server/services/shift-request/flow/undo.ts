import { instanceLocaleTag } from "~/server/utils/locale";
import { activeStaffName, conflict, isAbsent, today } from "~/server/services/shift-request/common";
import { ShiftRequestService } from "~/server/services/shift-request/store";
import type { ShiftRequest } from "~/server/services/shift-request/types";
import { revertRequest, revertableChanges, withCurrent } from "./apply";
import { describeRequest, notifyStaff } from "./notify";
import { apiError } from "~/server/utils/api-error";

type Member = { staffId: number; staffName: string; source?: "web" | "app" };

const PLAN_MOVED = "errors.requests.planMovedMember";

/** The other person of a request; anyone else does not see it at all. */
function otherOf(request: ShiftRequest, staffId: number): { id: number; name: string } {
  if (request.requester_staff_id === staffId && request.partner_staff_id !== null) {
    return { id: request.partner_staff_id, name: request.partner_name ?? "" };
  }
  if (request.partner_staff_id === staffId) return { id: request.requester_staff_id, name: request.requester_name };
  throw apiError(null, 404, "errors.requests.notFound");
}

/** Only before the day, only while both are in the team and nobody gets a shift back on a day they are away. */
function checkUndo(request: ShiftRequest, other: { id: number; name: string }): void {
  if (request.status !== "done") conflict("errors.requests.undoOnlyDone");
  if (request.date_from <= today()) conflict("errors.requests.undoDayBefore");
  if (!activeStaffName(other.id)) conflict("errors.requests.undoNotInTeam", { name: other.name });
  const names = new Map([
    [request.requester_staff_id, request.requester_name],
    [request.partner_staff_id, request.partner_name ?? ""],
  ]);
  const returned = revertableChanges(request, PLAN_MOVED).filter((change) => change.before);
  const away = returned.find((change) => isAbsent(change.staffId, change.date));
  if (away) conflict("errors.requests.undoAbsent", { name: names.get(away.staffId) ?? "" });
}

function subject(request: ShiftRequest): string {
  return request.kind === "takeover" ? "die Übernahme" : "den Tausch";
}

/** One of the two asks to undo; the plan stays as it is until the other one confirms. */
export async function requestUndo(request: ShiftRequest, member: Member): Promise<ShiftRequest> {
  const other = otherOf(request, member.staffId);
  const updated = withCurrent(request, (current) => {
    checkUndo(current, other);
    if (current.undo_requested_by !== null) conflict("errors.requests.undoAlreadyAsked");
    return ShiftRequestService.setUndoRequest(current.request_id, member.staffId, null);
  });
  await notifyStaff(
    [other.id],
    "Storno angefragt",
    `${member.staffName} möchte ${subject(request)} (${describeRequest(request, instanceLocaleTag())}) stornieren. Bitte bestätigen oder ablehnen.`
  );
  return updated;
}

/** The other person agrees: every day change of the request goes back, without the planner. */
export async function confirmUndo(request: ShiftRequest, member: Member, origin?: string): Promise<ShiftRequest> {
  const other = otherOf(request, member.staffId);
  const updated = withCurrent(request, (current) => {
    if (current.undo_requested_by === null) conflict("errors.requests.undoNotAsked");
    if (current.undo_requested_by === member.staffId) conflict("errors.requests.undoOtherConfirms");
    checkUndo(current, other);
    revertRequest(current, { userId: 0, username: member.staffName, source: member.source ?? "app" }, PLAN_MOVED, origin);
    return ShiftRequestService.setStatus(current.request_id, "reverted", { expected: "done", decidedBy: member.staffName });
  });
  await notifyStaff(
    [other.id],
    "Storno bestätigt",
    `${member.staffName} hat den Storno bestätigt. ${describeRequest(request, instanceLocaleTag())} ist wieder wie vorher.`
  );
  return updated;
}

/** The other person says no, or the asker takes the ask back. */
export async function declineUndo(request: ShiftRequest, member: Member): Promise<ShiftRequest> {
  const other = otherOf(request, member.staffId);
  const { updated, asker } = withCurrent(request, (current) => {
    if (current.status !== "done" || current.undo_requested_by === null) conflict("errors.requests.undoNotAsked");
    const asker = current.undo_requested_by;
    return { updated: ShiftRequestService.setUndoRequest(current.request_id, null, asker), asker };
  });
  if (asker === other.id) {
    await notifyStaff(
      [other.id],
      "Storno abgelehnt",
      `${member.staffName} möchte ${describeRequest(request, instanceLocaleTag())} so lassen, wie es ist.`
    );
  }
  return updated;
}
