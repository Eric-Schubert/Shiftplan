import { ShiftplanService } from "~/server/services/shiftplan.service";
import { getShiftplanGenerationConfig } from "~/server/config/domain-config";
import { validateYear, validateWeek, validateInteger } from "~/server/utils/validation";

/** Start week and length of a rollout, from a request body or query. */
export function readGenerationRange(input: Record<string, unknown>): { year: number; week: number; weeks: number } {
  const year = validateYear(input.year, "Jahr", { required: true })!;
  const week = validateWeek(input.week, "Woche", { required: true })!;
  const { generateWeeksMin, generateWeeksMax } = getShiftplanGenerationConfig();
  const weeks = validateInteger(input.weeks, "Anzahl Wochen", {
    required: true,
    min: generateWeeksMin,
    max: generateWeeksMax,
  })!;

  if (week > ShiftplanService.getISOWeeksInYear(year)) {
    throw createError({ statusCode: 400, statusMessage: `${year} hat keine KW ${week}` });
  }

  return { year, week, weeks };
}
