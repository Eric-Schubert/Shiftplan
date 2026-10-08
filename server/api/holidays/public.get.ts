import { defineEventHandler, getQuery, createError } from "h3";
import { PublicHolidayService } from "~/server/services/public-holiday.service";

export type { PublicHoliday } from "~/types/holiday";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const year = parseInt(query.year as string);
  const week = query.week ? parseInt(query.week as string) : null;

  if (!year || isNaN(year)) {
    throw createError({
      statusCode: 400,
      message: 'Parameter "year" ist erforderlich',
    });
  }

  try {
    return await PublicHolidayService.list(year, week);
  } catch (error: any) {
    console.error("Fehler beim Abrufen der Feiertage:", error);
    throw createError({
      statusCode: 500,
      message: `Fehler beim Abrufen der Feiertage: ${error.message}`,
    });
  }
});
