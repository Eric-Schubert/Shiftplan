import { PushService } from "~/server/services/push.service";
import {
  SWAP_MAX_DAYS,
  ShiftRequestService,
  type AppliedChange,
  type ShiftRequest,
} from "~/server/services/shift-request.service";
import { formatNoticeDay } from "~/server/utils/absence-notice";
import { applyDayChange, type DayChangeActor } from "~/server/utils/day-change-flow";
import { datesBetween, weekOfDate } from "~/server/utils/iso-week";

const REQUESTS_URL = "/?anfragen=1";

function span(request: ShiftRequest): string {
  return request.date_from === request.date_to
    ? formatNoticeDay(request.date_from)
    : `${formatNoticeDay(request.date_from)} – ${formatNoticeDay(request.date_to)}`;
}

/** „Spät, Fr. 09.10.“ for a takeover, the date range for a swap. */
export function describeRequest(request: ShiftRequest): string {
  return request.kind === "takeover" ? `${request.shift_name}, ${span(request)}` : span(request);
}

async function notify(task: Promise<unknown>): Promise<void> {
  try {
    await task;
  } catch (error) {
    console.error("[requests] Push fehlgeschlagen:", error);
  }
}

/** Applies the day changes of a request and records them for a possible undo. */
function apply(request: ShiftRequest, actor: DayChangeActor, origin?: string): AppliedChange[] {
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
  await notify(
    PushService.sendToStaff([request.partner_staff_id!], {
      title: "Tauschanfrage",
      body: `${request.requester_name} möchte ${describeRequest(request)} die Schichten mit dir tauschen.${extra}`,
      url: REQUESTS_URL,
      kind: "requests",
    })
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

  if (ShiftRequestService.requiresApproval()) {
    const updated = ShiftRequestService.setStatus(request.request_id, "pending_approval", {
      partnerStaffId: member.staffId,
    });
    await notify(
      PushService.sendToStaff([request.requester_staff_id], {
        title: request.kind === "takeover" ? "Übernahme zugesagt" : "Tausch zugesagt",
        body: `${member.staffName} hat zugesagt (${describeRequest(request)}). Die Planung muss noch freigeben.`,
        url: REQUESTS_URL,
        kind: "requests",
      })
    );
    return updated;
  }

  const applied = apply(accepted, { userId: 0, username: member.staffName, source: member.source ?? "app" }, origin);
  const updated = ShiftRequestService.setStatus(request.request_id, "done", { partnerStaffId: member.staffId, applied });
  await notify(
    PushService.sendToStaff([request.requester_staff_id], {
      title: request.kind === "takeover" ? "Schicht übernommen" : "Tausch steht",
      body:
        request.kind === "takeover"
          ? `${member.staffName} übernimmt ${describeRequest(request)}.`
          : `${member.staffName} hat dem Tausch zugestimmt (${describeRequest(request)}).`,
      url: REQUESTS_URL,
      kind: "requests",
    })
  );
  return updated;
}

export async function declineRequest(request: ShiftRequest, staffId: number, staffName: string): Promise<ShiftRequest> {
  if (request.kind !== "swap" || request.partner_staff_id !== staffId) {
    throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
  }
  if (request.status !== "open") throw createError({ statusCode: 409, statusMessage: "Die Anfrage ist nicht mehr offen" });
  const updated = ShiftRequestService.setStatus(request.request_id, "declined");
  await notify(
    PushService.sendToStaff([request.requester_staff_id], {
      title: "Tausch abgelehnt",
      body: `${staffName} kann ${describeRequest(request)} nicht tauschen.`,
      url: REQUESTS_URL,
      kind: "requests",
    })
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

/** Planner decisions on requests waiting for approval, and undo of finished ones. */
export async function decideRequest(
  request: ShiftRequest,
  action: "approve" | "reject" | "revert",
  planner: { userId: number; username: string; source: "web" | "app" },
  origin?: string
): Promise<ShiftRequest> {
  const people = [request.requester_staff_id, request.partner_staff_id].filter((id): id is number => id !== null);

  if (action === "revert") {
    if (request.status !== "done") throw createError({ statusCode: 409, statusMessage: "Nur durchgeführte Anfragen lassen sich zurücknehmen" });
    const changes = ShiftRequestService.appliedChanges(request.request_id).reverse();
    for (const change of changes) {
      applyDayChange({
        staffId: change.staffId,
        shiftId: change.shiftId,
        date: change.date,
        present: change.before,
        actor: planner,
        note: "Anfrage zurückgenommen",
        origin,
      });
    }
    const updated = ShiftRequestService.setStatus(request.request_id, "reverted", { decidedBy: planner.username });
    await notify(
      PushService.sendToStaff(people, {
        title: "Anfrage zurückgenommen",
        body: `Die Planung hat ${request.kind === "takeover" ? "die Übernahme" : "den Tausch"} (${describeRequest(request)}) zurückgenommen.`,
        url: REQUESTS_URL,
        kind: "requests",
      })
    );
    return updated;
  }

  if (request.status !== "pending_approval") {
    throw createError({ statusCode: 409, statusMessage: "Die Anfrage wartet nicht auf eine Freigabe" });
  }
  if (action === "reject") {
    const updated = ShiftRequestService.setStatus(request.request_id, "rejected", { decidedBy: planner.username });
    await notify(
      PushService.sendToStaff(people, {
        title: "Anfrage abgelehnt",
        body: `Die Planung hat ${describeRequest(request)} nicht freigegeben.`,
        url: REQUESTS_URL,
        kind: "requests",
      })
    );
    return updated;
  }

  const applied = apply(request, planner, origin);
  const updated = ShiftRequestService.setStatus(request.request_id, "done", { decidedBy: planner.username, applied });
  await notify(
    PushService.sendToStaff(people, {
      title: "Anfrage freigegeben",
      body: `Die Planung hat ${request.kind === "takeover" ? "die Übernahme" : "den Tausch"} freigegeben (${describeRequest(request)}).`,
      url: REQUESTS_URL,
      kind: "requests",
    })
  );
  return updated;
}
