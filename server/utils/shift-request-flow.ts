import { applyRequest } from "~/server/lib/shift-requests/apply";
import { REQUESTS_URL, describeRequest, notify, notifyStaff } from "~/server/lib/shift-requests/notify";
import { PushService } from "~/server/services/push.service";
import { ShiftRequestService, type ShiftRequest } from "~/server/services/shift-request.service";
import { weekOfDate } from "~/server/utils/iso-week";

export { describeRequest } from "~/server/lib/shift-requests/notify";
export { decideRequest } from "~/server/lib/shift-requests/decide";

export async function createTakeover(input: {
  staffId: number;
  staffName: string;
  date: string;
  shiftId?: number | null;
  message?: string | null;
  absenceId?: number | null;
  notifyTeam?: boolean;
}): Promise<ShiftRequest> {
  const request = ShiftRequestService.createTakeover({ ...input, createdBy: input.staffName });
  if (input.notifyTeam !== false) {
    const { year, week } = weekOfDate(request.date_from);
    const extra = request.message ? `\n${request.message}` : "";
    await notify(
      PushService.sendTeamNotice(
        {
          title: "Übernahme gesucht",
          body: `${request.requester_name} sucht Ersatz: ${describeRequest(request)}${extra}`,
          url: REQUESTS_URL,
          year,
          week,
        },
        { excludeStaffId: request.requester_staff_id }
      )
    );
  }
  return request;
}

export async function createSwap(input: {
  staffId: number;
  staffName: string;
  partnerStaffId: number;
  from: string;
  to: string;
  message?: string | null;
}): Promise<ShiftRequest> {
  const request = ShiftRequestService.createSwap({ ...input, createdBy: input.staffName });
  const extra = request.message ? `\n${request.message}` : "";
  await notifyStaff(
    [request.partner_staff_id!],
    "Tauschanfrage",
    `${request.requester_name} möchte ${describeRequest(request)} die Schichten mit dir tauschen.${extra}`
  );
  return request;
}

/** A colleague accepts. Without planner approval the plan changes right away. */
export async function acceptRequest(
  request: ShiftRequest,
  member: { staffId: number; staffName: string; source?: "web" | "app" },
  origin?: string
): Promise<ShiftRequest> {
  ShiftRequestService.checkAccept(request, member.staffId);
  const accepted = { ...request, partner_staff_id: member.staffId, partner_name: member.staffName };
  const isTakeover = request.kind === "takeover";

  if (ShiftRequestService.requiresApproval()) {
    const updated = ShiftRequestService.setStatus(request.request_id, "pending_approval", {
      partnerStaffId: member.staffId,
    });
    await notifyStaff(
      [request.requester_staff_id],
      isTakeover ? "Übernahme zugesagt" : "Tausch zugesagt",
      `${member.staffName} hat zugesagt (${describeRequest(request)}). Die Planung muss noch freigeben.`
    );
    return updated;
  }

  const applied = applyRequest(accepted, { userId: 0, username: member.staffName, source: member.source ?? "app" }, origin);
  const updated = ShiftRequestService.setStatus(request.request_id, "done", { partnerStaffId: member.staffId, applied });
  await notifyStaff(
    [request.requester_staff_id],
    isTakeover ? "Schicht übernommen" : "Tausch steht",
    isTakeover
      ? `${member.staffName} übernimmt ${describeRequest(request)}.`
      : `${member.staffName} hat dem Tausch zugestimmt (${describeRequest(request)}).`
  );
  return updated;
}

export async function declineRequest(request: ShiftRequest, staffId: number, staffName: string): Promise<ShiftRequest> {
  if (request.kind !== "swap" || request.partner_staff_id !== staffId) {
    throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
  }
  if (request.status !== "open") throw createError({ statusCode: 409, statusMessage: "Die Anfrage ist nicht mehr offen" });
  const updated = ShiftRequestService.setStatus(request.request_id, "declined");
  await notifyStaff(
    [request.requester_staff_id],
    "Tausch abgelehnt",
    `${staffName} kann ${describeRequest(request)} nicht tauschen.`
  );
  return updated;
}

export function cancelRequest(request: ShiftRequest, staffId: number): ShiftRequest {
  if (request.requester_staff_id !== staffId) throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
  if (request.status !== "open" && request.status !== "pending_approval") {
    throw createError({ statusCode: 409, statusMessage: "Die Anfrage ist schon abgeschlossen" });
  }
  return ShiftRequestService.setStatus(request.request_id, "cancelled");
}
