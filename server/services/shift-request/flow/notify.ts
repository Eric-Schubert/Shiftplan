import { PushService } from "~/server/services/push.service";
import type { ShiftRequest } from "~/server/services/shift-request/types";
import { formatDayRange } from "~/shared/utils/format/day";

export const REQUESTS_URL = "/?anfragen=1";

/** „Spät, Fr. 09.10.“ for a takeover, the date range for a swap. Pushes use the instance language for now. */
export function describeRequest(request: ShiftRequest, locale: string): string {
  const span = formatDayRange(locale, request.date_from, request.date_to);
  return request.kind === "takeover" ? `${request.shift_name}, ${span}` : span;
}

export async function notify(task: Promise<unknown>): Promise<void> {
  try {
    await task;
  } catch (error) {
    console.error("[requests] Push failed:", error);
  }
}

/** Push to the given staff with a link to the requests view. */
export function notifyStaff(staffIds: number[], title: string, body: string): Promise<void> {
  return notify(PushService.sendToStaff(staffIds, { title, body, url: REQUESTS_URL, kind: "requests" }));
}
