import { ShiftRequestService, type ShiftRequest } from "~/server/services/shift-request.service";
import { conflict, isAbsent, today } from "~/server/services/shift-request/common";
import { revertRequest } from "./apply";
import { describeRequest, notifyStaff } from "./notify";

type Member = { staffId: number; staffName: string; source?: "web" | "app" };

/** The other person of a request; anyone else does not see it at all. */
function otherOf(request: ShiftRequest, staffId: number): { id: number; name: string } {
  if (request.requester_staff_id === staffId && request.partner_staff_id !== null) {
    return { id: request.partner_staff_id, name: request.partner_name ?? "" };
  }
  if (request.partner_staff_id === staffId) return { id: request.requester_staff_id, name: request.requester_name };
  throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
}

/** Only before the day, and only if the person who gets shifts back is not away then. */
function checkUndo(request: ShiftRequest, receiver: { id: number; name: string }): void {
  if (request.status !== "done") conflict("Nur durchgeführte Anfragen lassen sich stornieren");
  if (request.date_from <= today()) conflict("Stornieren geht nur bis zum Vortag");
  const returned = ShiftRequestService.appliedChanges(request.request_id).filter(
    (change) => change.staffId === receiver.id && change.before
  );
  if (returned.some((change) => isAbsent(receiver.id, change.date))) {
    conflict(`${receiver.name} ist an dem Tag abwesend und kann nichts zurücknehmen`);
  }
}

function subject(request: ShiftRequest): string {
  return request.kind === "takeover" ? "die Übernahme" : "den Tausch";
}

/** One of the two asks to undo; the plan stays as it is until the other one confirms. */
export async function requestUndo(request: ShiftRequest, member: Member): Promise<ShiftRequest> {
  const other = otherOf(request, member.staffId);
  checkUndo(request, other);
  if (request.undo_requested_by !== null) conflict("Ein Storno ist schon angefragt");
  const updated = ShiftRequestService.setUndoRequest(request.request_id, member.staffId);
  await notifyStaff(
    [other.id],
    "Storno angefragt",
    `${member.staffName} möchte ${subject(request)} (${describeRequest(request)}) stornieren. Bitte bestätigen oder ablehnen.`
  );
  return updated;
}

/** The other person agrees: every day change of the request goes back, without the planner. */
export async function confirmUndo(request: ShiftRequest, member: Member, origin?: string): Promise<ShiftRequest> {
  const other = otherOf(request, member.staffId);
  if (request.undo_requested_by === null) conflict("Es ist kein Storno angefragt");
  if (request.undo_requested_by === member.staffId) conflict("Den Storno muss die andere Person bestätigen");
  checkUndo(request, { id: member.staffId, name: member.staffName });
  revertRequest(request, { userId: 0, username: member.staffName, source: member.source ?? "app" }, origin);
  const updated = ShiftRequestService.setStatus(request.request_id, "reverted", { decidedBy: member.staffName });
  await notifyStaff(
    [other.id],
    "Storno bestätigt",
    `${member.staffName} hat den Storno bestätigt. ${describeRequest(request)} ist wieder wie vorher.`
  );
  return updated;
}

/** The other person says no, or the asker takes the ask back. */
export async function declineUndo(request: ShiftRequest, member: Member): Promise<ShiftRequest> {
  const other = otherOf(request, member.staffId);
  if (request.status !== "done" || request.undo_requested_by === null) conflict("Es ist kein Storno angefragt");
  const updated = ShiftRequestService.setUndoRequest(request.request_id, null);
  if (request.undo_requested_by === other.id) {
    await notifyStaff(
      [other.id],
      "Storno abgelehnt",
      `${member.staffName} möchte ${describeRequest(request)} so lassen, wie es ist.`
    );
  }
  return updated;
}
