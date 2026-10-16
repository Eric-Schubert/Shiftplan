import { conflict } from "~/server/services/shift-request/common";
import { ShiftRequestService } from "~/server/services/shift-request/store";
import type { ShiftRequest } from "~/server/services/shift-request/types";
import { applyRequest, revertRequest, withCurrent } from "./apply";
import { notifyStaff } from "./notify";

/** Planner decisions on requests waiting for approval, and undo of finished ones. */
export async function decideRequest(
  request: ShiftRequest,
  action: "approve" | "reject" | "revert",
  planner: { userId: number; username: string; source: "web" | "app" },
  origin?: string
): Promise<ShiftRequest> {
  const people = (done: ShiftRequest) => [done.requester_staff_id, done.partner_staff_id].filter((id): id is number => id !== null);
  const takeover = request.kind === "takeover";
  const decidedBy = planner.username;

  if (action === "revert") {
    const updated = withCurrent(request, (current) => {
      if (current.status !== "done") conflict("errors.requests.revertOnlyDone");
      revertRequest(current, planner, "errors.requests.planMovedPlanner", origin);
      // An open undo ask is answered by the planner's revert.
      return ShiftRequestService.setStatus(current.request_id, "reverted", { expected: "done", decidedBy, undoRequestedBy: null });
    });
    await notifyStaff(people(updated), request, takeover ? "takeoverReverted" : "swapReverted", decidedBy);
    return updated;
  }

  const updated = withCurrent(request, (current) => {
    if (current.status !== "pending_approval") conflict("errors.requests.notAwaitingApproval");
    if (action === "reject") {
      return ShiftRequestService.setStatus(current.request_id, "rejected", { expected: "pending_approval", decidedBy });
    }
    ShiftRequestService.checkApplicable(current, current.partner_staff_id!);
    const applied = applyRequest(current, planner, origin);
    return ShiftRequestService.setStatus(current.request_id, "done", { expected: "pending_approval", decidedBy, applied });
  });
  const text = action === "reject" ? "rejected" : takeover ? "takeoverApproved" : "swapApproved";
  await notifyStaff(people(updated), request, text, decidedBy);
  return updated;
}
