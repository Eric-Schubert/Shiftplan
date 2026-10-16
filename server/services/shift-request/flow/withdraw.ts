import { instanceLocaleTag } from "~/server/utils/locale";
import { conflict } from "~/server/services/shift-request/common";
import { ShiftRequestService } from "~/server/services/shift-request/store";
import type { ShiftRequest } from "~/server/services/shift-request/types";
import { withCurrent } from "./apply";
import { describeRequest, notifyStaff } from "./notify";

type Member = { staffId: number; staffName: string };

function notFound(): never {
  throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
}

/** The asked partner says no to a swap. */
export async function declineRequest(request: ShiftRequest, staffId: number, staffName: string): Promise<ShiftRequest> {
  if (request.kind !== "swap" || request.partner_staff_id !== staffId) notFound();
  const updated = withCurrent(request, (current) => {
    if (current.status !== "open") conflict("Die Anfrage ist nicht mehr offen");
    return ShiftRequestService.setStatus(current.request_id, "declined", { expected: "open" });
  });
  await notifyStaff([request.requester_staff_id], "Tausch abgelehnt", `${staffName} kann ${describeRequest(request, instanceLocaleTag())} nicht tauschen.`);
  return updated;
}

/** The helper takes back a yes that waits for approval: a takeover goes back to the team, a swap was for them only. */
async function withdrawAcceptance(request: ShiftRequest, member: Member): Promise<ShiftRequest> {
  const takeover = request.kind === "takeover";
  const updated = withCurrent(request, (current) =>
    ShiftRequestService.setStatus(
      current.request_id,
      takeover ? "open" : "declined",
      takeover ? { expected: "pending_approval", partnerStaffId: null } : { expected: "pending_approval" }
    )
  );
  await notifyStaff(
    [request.requester_staff_id],
    "Zusage zurückgezogen",
    takeover
      ? `${member.staffName} übernimmt ${describeRequest(request, instanceLocaleTag())} doch nicht. Die Übernahme ist wieder offen.`
      : `${member.staffName} möchte ${describeRequest(request, instanceLocaleTag())} doch nicht tauschen.`
  );
  return updated;
}

/** The requester withdraws an unfinished request, or the helper takes back a yes that waits for approval. */
export async function cancelRequest(request: ShiftRequest, member: Member): Promise<ShiftRequest> {
  if (request.status === "pending_approval" && request.partner_staff_id === member.staffId) {
    return withdrawAcceptance(request, member);
  }
  if (request.requester_staff_id !== member.staffId) notFound();
  const { updated, partner } = withCurrent(request, (current) => {
    if (current.status !== "open" && current.status !== "pending_approval") conflict("Die Anfrage ist schon abgeschlossen");
    const updated = ShiftRequestService.setStatus(current.request_id, "cancelled", { expected: current.status });
    return { updated, partner: current.partner_staff_id };
  });
  // The colleague who agreed, or who was asked to swap, should not wait for it any more.
  if (partner !== null) {
    await notifyStaff([partner], "Anfrage zurückgezogen", `${member.staffName} hat die Anfrage (${describeRequest(request, instanceLocaleTag())}) zurückgezogen.`);
  }
  return updated;
}
