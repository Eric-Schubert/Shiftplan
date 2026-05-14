import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { getShiftplanGenerationConfig } from "~/server/config/domain-config";
import { validateYear, validateWeek, validateInteger } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readBody(event);


  const year = validateYear(body.year, "Jahr", { required: true })!;
  const week = validateWeek(body.week, "Woche", { required: true })!;
  const hasWeeksParameter =
    body.weeks !== undefined && body.weeks !== null && body.weeks !== "";
  const generationConfig = getShiftplanGenerationConfig();
  const weeks = validateInteger(body.weeks, "Anzahl Wochen", {
    min: generationConfig.generateWeeksMin,
    max: generationConfig.generateWeeksMax,
  });


  if (hasWeeksParameter && weeks) {
    return ShiftplanService.generateMultipleWeeks(year, week, weeks);
  }


  return ShiftplanService.generateFromPattern(year, week);
});
