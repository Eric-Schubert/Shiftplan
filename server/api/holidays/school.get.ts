import { defineEventHandler, getQuery } from "h3";
import { resolveSchoolHolidaySubdivisionCodes } from "~/server/config/holiday-config";
import { SchoolHolidayService } from "~/server/services/school-holiday.service";
import { apiError } from "~/server/utils/api-error";
import { validateWeek, validateYear } from "~/server/utils/validation";

export type { SchoolHoliday } from "~/server/services/school-holiday.service";
export type { SchoolHolidayPeriod } from "~/types/holiday";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const statesParam = Array.isArray(query.states) ? query.states.join(",") : (query.states as string | undefined);
  const states = resolveSchoolHolidaySubdivisionCodes(event, statesParam);

  // Public route: only years and weeks the app can show, so arbitrary values cause no upstream requests.
  const year = validateYear(query.year, "year");
  if (year === undefined) {
    throw apiError(event, 400, "errors.holidays.yearRequired");
  }
  const week = query.week ? (validateWeek(query.week, "week", { year }) ?? null) : null;

  try {
    return await SchoolHolidayService.list(year, week, states);
  } catch (error) {
    // The upstream message stays in the log; the client only learns that the source failed.
    console.error("[holidays] Fetching school holidays failed:", error);
    throw apiError(event, 502, "errors.holidays.schoolFailed");
  }
});
