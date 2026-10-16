import { formatDayRange } from "~/shared/utils/format/day";
import type { ShiftRequest } from "~/types/shift-request";

/** „Do. 08.10.“ or „Mo. 12.10. – Fr. 23.10.“ for the days a shift request covers. */
export function formatRequestPeriod(locale: string, request: Pick<ShiftRequest, "date_from" | "date_to">): string {
  return formatDayRange(locale, request.date_from, request.date_to);
}
