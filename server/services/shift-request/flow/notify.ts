import { localeTag, type AppLocale } from "~/i18n/config";
import type requests from "~/i18n/locales/de/push-requests";
import { t } from "~/i18n/server";
import { PushService } from "~/server/services/push.service";
import type { ShiftRequest } from "~/server/services/shift-request/types";
import { formatDayRange } from "~/shared/utils/format/day";

export const REQUESTS_URL = "/?anfragen=1";

/** A request push of the catalog (push.requests.*), each with a title and a body. */
export type RequestText = keyof typeof requests;

/** „Spät, Fr. 09.10.“ for a takeover, the date range for a swap. */
export function describeRequest(request: ShiftRequest, locale: string): string {
  const days = formatDayRange(localeTag(locale), request.date_from, request.date_to);
  return request.kind === "takeover" ? t(locale, "push.requestShift", { shift: request.shift_name ?? "", days }) : days;
}

/**
 * Title and body of a request push in a recipient's language. `name` is the person who acted;
 * a personal note follows on its own line, as written.
 */
export function requestText(request: ShiftRequest, text: RequestText, name: string, note?: string | null) {
  return (locale: AppLocale) => {
    const body = t(locale, `push.requests.${text}.body`, { name, request: describeRequest(request, locale) });
    return { title: t(locale, `push.requests.${text}.title`), body: note ? `${body}\n${note}` : body };
  };
}

export async function notify(task: Promise<unknown>): Promise<void> {
  try {
    await task;
  } catch (error) {
    console.error("[requests] Push failed:", error);
  }
}

/** Push to the given staff with a link to the requests view, on each device in its language. */
export function notifyStaff(staffIds: number[], request: ShiftRequest, text: RequestText, name: string, note?: string | null): Promise<void> {
  const render = requestText(request, text, name, note);
  return notify(PushService.sendToStaff(staffIds, (locale) => ({ ...render(locale), url: REQUESTS_URL, kind: "requests" })));
}
