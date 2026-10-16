import { DEFAULT_LOCALE } from "~/i18n/config";
import { conflict } from "~/server/services/shift-request/common";
import { ShiftRequestService } from "~/server/services/shift-request/store";
import type { ShiftRequest } from "~/server/services/shift-request/types";
import { applyRequest, revertRequest, withCurrent } from "./apply";
import { describeRequest, notifyStaff } from "./notify";

const PLAN_MOVED = "Der Plan hat sich seitdem geändert, z. B. durch eine spätere Anfrage. Bitte die Tage direkt im Plan anpassen.";

/** Planner decisions on requests waiting for approval, and undo of finished ones. */
export async function decideRequest(
  request: ShiftRequest,
  action: "approve" | "reject" | "revert",
  planner: { userId: number; username: string; source: "web" | "app" },
  origin?: string
): Promise<ShiftRequest> {
  const people = (done: ShiftRequest) =>
    [done.requester_staff_id, done.partner_staff_id].filter((id): id is number => id !== null);
  const subject = request.kind === "takeover" ? "die Übernahme" : "den Tausch";
  const decidedBy = planner.username;

  if (action === "revert") {
    const updated = withCurrent(request, (current) => {
      if (current.status !== "done") conflict("Nur durchgeführte Anfragen lassen sich zurücknehmen");
      revertRequest(current, planner, PLAN_MOVED, origin);
      // An open undo ask is answered by the planner's revert.
      return ShiftRequestService.setStatus(current.request_id, "reverted", { expected: "done", decidedBy, undoRequestedBy: null });
    });
    await notifyStaff(
      people(updated),
      "Anfrage zurückgenommen",
      `Die Planung hat ${subject} (${describeRequest(request, DEFAULT_LOCALE)}) zurückgenommen.`
    );
    return updated;
  }

  const updated = withCurrent(request, (current) => {
    if (current.status !== "pending_approval") conflict("Die Anfrage wartet nicht auf eine Freigabe");
    if (action === "reject") {
      return ShiftRequestService.setStatus(current.request_id, "rejected", { expected: "pending_approval", decidedBy });
    }
    ShiftRequestService.checkApplicable(current, current.partner_staff_id!);
    const applied = applyRequest(current, planner, origin);
    return ShiftRequestService.setStatus(current.request_id, "done", { expected: "pending_approval", decidedBy, applied });
  });
  if (action === "reject") {
    await notifyStaff(people(updated), "Anfrage abgelehnt", `Die Planung hat ${describeRequest(request, DEFAULT_LOCALE)} nicht freigegeben.`);
  } else {
    await notifyStaff(people(updated), "Anfrage freigegeben", `Die Planung hat ${subject} freigegeben (${describeRequest(request, DEFAULT_LOCALE)}).`);
  }
  return updated;
}
