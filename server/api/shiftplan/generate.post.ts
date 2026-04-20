import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateYear, validateWeek, validateInteger } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readBody(event);

  // Input-Validierung
  const year = validateYear(body.year, "Jahr", { required: true })!;
  const week = validateWeek(body.week, "Woche", { required: true })!;
  const weeks = validateInteger(body.weeks, "Anzahl Wochen", { min: 1, max: 53 });

  // Wenn mehrere Wochen angefordert
  if (weeks && weeks > 1) {
    return ShiftplanService.generateMultipleWeeks(year, week, weeks);
  }

  // Einzelne Woche generieren
  return ShiftplanService.generateFromPattern(year, week);
});
