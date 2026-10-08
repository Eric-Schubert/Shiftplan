import { PushService } from "~/server/services/push.service";
import type { ShiftRequest } from "~/server/services/shift-request.service";
import { formatNoticeDay } from "~/server/utils/absence-notice";

export const REQUESTS_URL = "/?anfragen=1";

function span(request: ShiftRequest): string {
  return request.date_from === request.date_to
    ? formatNoticeDay(request.date_from)
    : `${formatNoticeDay(request.date_from)} – ${formatNoticeDay(request.date_to)}`;
}

/** „Spät, Fr. 09.10.“ for a takeover, the date range for a swap. */
export function describeRequest(request: ShiftRequest): string {
  return request.kind === "takeover" ? `${request.shift_name}, ${span(request)}` : span(request);
}

export async function notify(task: Promise<unknown>): Promise<void> {
  try {
    await task;
  } catch (error) {
    console.error("[requests] Push fehlgeschlagen:", error);
  }
}

/** Push to the given staff with a link to the requests view. */
export function notifyStaff(staffIds: number[], title: string, body: string): Promise<void> {
  return notify(PushService.sendToStaff(staffIds, { title, body, url: REQUESTS_URL, kind: "requests" }));
}
