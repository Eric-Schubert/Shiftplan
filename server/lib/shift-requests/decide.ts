import { ShiftRequestService, type ShiftRequest } from "~/server/services/shift-request.service";
import { applyRequest, revertRequest } from "./apply";
import { describeRequest, notifyStaff } from "./notify";

/** Planner decisions on requests waiting for approval, and undo of finished ones. */
export async function decideRequest(
  request: ShiftRequest,
  action: "approve" | "reject" | "revert",
  planner: { userId: number; username: string; source: "web" | "app" },
  origin?: string
): Promise<ShiftRequest> {
  const people = [request.requester_staff_id, request.partner_staff_id].filter((id): id is number => id !== null);
  const subject = request.kind === "takeover" ? "die Übernahme" : "den Tausch";

  if (action === "revert") {
    if (request.status !== "done") throw createError({ statusCode: 409, statusMessage: "Nur durchgeführte Anfragen lassen sich zurücknehmen" });
    revertRequest(request, planner, origin);
    const updated = ShiftRequestService.setStatus(request.request_id, "reverted", { decidedBy: planner.username });
    await notifyStaff(
      people,
      "Anfrage zurückgenommen",
      `Die Planung hat ${subject} (${describeRequest(request)}) zurückgenommen.`
    );
    return updated;
  }

  if (request.status !== "pending_approval") {
    throw createError({ statusCode: 409, statusMessage: "Die Anfrage wartet nicht auf eine Freigabe" });
  }
  if (action === "reject") {
    const updated = ShiftRequestService.setStatus(request.request_id, "rejected", { decidedBy: planner.username });
    await notifyStaff(people, "Anfrage abgelehnt", `Die Planung hat ${describeRequest(request)} nicht freigegeben.`);
    return updated;
  }

  const applied = applyRequest(request, planner, origin);
  const updated = ShiftRequestService.setStatus(request.request_id, "done", { decidedBy: planner.username, applied });
  await notifyStaff(
    people,
    "Anfrage freigegeben",
    `Die Planung hat ${subject} freigegeben (${describeRequest(request)}).`
  );
  return updated;
}
