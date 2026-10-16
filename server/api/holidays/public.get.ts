import { defineEventHandler, getQuery } from "h3";
import { PublicHolidayService } from "~/server/services/public-holiday.service";
import { apiError } from "~/server/utils/api-error";
import { validateWeek, validateYear } from "~/server/utils/validation";

export type { PublicHoliday } from "~/types/holiday";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  // Public route: only years and weeks the app can show, so arbitrary values cause no upstream requests.
  const year = validateYear(query.year, "year");
  if (year === undefined) {
    throw apiError(event, 400, "errors.holidays.yearRequired");
  }
  const week = query.week ? (validateWeek(query.week, "week", { year }) ?? null) : null;

  try {
    return await PublicHolidayService.list(year, week);
  } catch (error) {
    // The upstream message stays in the log; the client only learns that the source failed.
    console.error("[holidays] Fetching public holidays failed:", error);
    throw apiError(event, 502, "errors.holidays.publicFailed");
  }
});
