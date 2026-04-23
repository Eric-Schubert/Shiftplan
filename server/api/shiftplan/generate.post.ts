import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateYear, validateWeek, validateInteger } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readBody(event);

  // Input-Validierung
  const year = validateYear(body.year, "Jahr", { required: true })!;
  const week = validateWeek(body.week, "Woche", { required: true })!;
  const hasWeeksParameter =
    body.weeks !== undefined && body.weeks !== null && body.weeks !== "";
  const weeks = validateInteger(body.weeks, "Anzahl Wochen", { min: 1, max: 53 });

  // Wenn der Mehrwochen-Dialog eine Wochenzahl sendet, liefern wir immer die
  // Mehrwochen-Zusammenfassung zurueck, auch wenn es nur eine Woche ist.
  if (hasWeeksParameter && weeks) {
    return ShiftplanService.generateMultipleWeeks(year, week, weeks);
  }

  // Einzelne Woche generieren
  return ShiftplanService.generateFromPattern(year, week);
});
