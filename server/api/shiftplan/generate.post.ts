import { ShiftplanService } from "~/server/services/shiftplan.service";

interface GenerateBody {
  year: number;
  week: number;
  weeks?: number; // Optional: Mehrere Wochen auf einmal generieren
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GenerateBody>(event);

  if (!body.year || !body.week) {
    throw createError({
      statusCode: 400,
      statusMessage: "Jahr und Woche sind erforderlich",
    });
  }

  // Wenn mehrere Wochen angefordert
  if (body.weeks && body.weeks > 1) {
    return ShiftplanService.generateMultipleWeeks(body.year, body.week, body.weeks);
  }

  // Einzelne Woche generieren
  return ShiftplanService.generateFromPattern(body.year, body.week);
});
