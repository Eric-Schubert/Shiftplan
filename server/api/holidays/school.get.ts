import { defineEventHandler, getQuery, createError } from "h3";
import { resolveSchoolHolidaySubdivisionCodes } from "~/server/config/holiday-config";
import { SchoolHolidayService } from "~/server/services/school-holiday.service";

export type { SchoolHoliday } from "~/server/services/school-holiday.service";
export type { SchoolHolidayPeriod } from "~/types/holiday";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const year = parseInt(query.year as string);
  const week = query.week ? parseInt(query.week as string) : null;
  const statesParam = Array.isArray(query.states)
    ? query.states.join(",")
    : query.states as string | undefined;
  const states = resolveSchoolHolidaySubdivisionCodes(statesParam);

  if (!year || isNaN(year)) {
    throw createError({
      statusCode: 400,
      message: 'Parameter "year" ist erforderlich',
    });
  }

  try {
    return await SchoolHolidayService.list(year, week, states);
  } catch (error: any) {
    console.error("Fehler beim Abrufen der Schulferien:", error);
    throw createError({
      statusCode: 500,
      message: `Fehler beim Abrufen der Schulferien: ${error.message}`,
    });
  }
});
