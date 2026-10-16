import { defineEventHandler, getQuery } from "h3";
import { PublicHolidayService } from "~/server/services/public-holiday.service";
import { apiError } from "~/server/utils/api-error";

export type { PublicHoliday } from "~/types/holiday";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const year = parseInt(query.year as string);
  const week = query.week ? parseInt(query.week as string) : null;

  if (!year || isNaN(year)) {
    throw apiError(event, 400, "errors.holidays.yearRequired");
  }

  try {
    return await PublicHolidayService.list(year, week);
  } catch (error: any) {
    console.error("[holidays] Fetching public holidays failed:", error);
    throw apiError(event, 500, "errors.holidays.publicFailed", { detail: error.message });
  }
});
