import { formatAbsenceRange } from "~/types/absence";
import type { ShiftRequest } from "~/types/shift-request";

/** „Do 08.10.“ or „Mo 12.10. – Fr 23.10.“ for the days a shift request covers. */
export function formatRequestPeriod(request: Pick<ShiftRequest, "date_from" | "date_to">): string {
  return formatAbsenceRange({ range_from: request.date_from, range_to: request.date_to });
}
