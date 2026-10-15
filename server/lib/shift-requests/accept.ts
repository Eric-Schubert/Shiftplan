import { ShiftRequestService, type ShiftRequest } from "~/server/services/shift-request.service";
import { applyRequest, withCurrent } from "./apply";
import { describeRequest, notifyStaff } from "./notify";

/** A colleague accepts. Without planner approval the plan changes right away. */
export async function acceptRequest(
  request: ShiftRequest,
  member: { staffId: number; staffName: string; source?: "web" | "app" },
  origin?: string
): Promise<ShiftRequest> {
  const isTakeover = request.kind === "takeover";
  const approval = ShiftRequestService.requiresApproval();
  const updated = withCurrent(request, (current) => {
    ShiftRequestService.checkAccept(current, member.staffId);
    if (approval) {
      return ShiftRequestService.setStatus(current.request_id, "pending_approval", {
        expected: "open",
        partnerStaffId: member.staffId,
      });
    }
    const accepted = { ...current, partner_staff_id: member.staffId, partner_name: member.staffName };
    const applied = applyRequest(accepted, { userId: 0, username: member.staffName, source: member.source ?? "app" }, origin);
    return ShiftRequestService.setStatus(current.request_id, "done", { expected: "open", partnerStaffId: member.staffId, applied });
  });

  if (approval) {
    await notifyStaff(
      [request.requester_staff_id],
      isTakeover ? "Übernahme zugesagt" : "Tausch zugesagt",
      `${member.staffName} hat zugesagt (${describeRequest(request)}). Die Planung muss noch freigeben.`
    );
    return updated;
  }
  await notifyStaff(
    [request.requester_staff_id],
    isTakeover ? "Schicht übernommen" : "Tausch steht",
    isTakeover
      ? `${member.staffName} übernimmt ${describeRequest(request)}.`
      : `${member.staffName} hat dem Tausch zugestimmt (${describeRequest(request)}).`
  );
  return updated;
}
