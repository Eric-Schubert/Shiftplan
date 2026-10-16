import { defineEventHandler, getQuery } from "h3";
import { resolveSchoolHolidaySubdivisionCodes } from "~/server/config/holiday-config";
import { SchoolHolidayService } from "~/server/services/school-holiday.service";
import { apiError } from "~/server/utils/api-error";

export type { SchoolHoliday } from "~/server/services/school-holiday.service";
export type { SchoolHolidayPeriod } from "~/types/holiday";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const year = parseInt(query.year as string);
  const week = query.week ? parseInt(query.week as string) : null;
  const statesParam = Array.isArray(query.states) ? query.states.join(",") : (query.states as string | undefined);
  const states = resolveSchoolHolidaySubdivisionCodes(event, statesParam);

  if (!year || isNaN(year)) {
    throw apiError(event, 400, "errors.holidays.yearRequired");
  }

  try {
    return await SchoolHolidayService.list(year, week, states);
  } catch (error) {
    console.error("[holidays] Fetching school holidays failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    throw apiError(event, 500, "errors.holidays.schoolFailed", { detail });
  }
});
