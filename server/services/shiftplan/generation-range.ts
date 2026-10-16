import { getShiftplanGenerationConfig } from "~/server/config/domain-config";
import { validateYear, validateWeek, validateInteger } from "~/server/utils/validation";
import { isoWeeksInYear } from "~/shared/utils/week";
import { apiError } from "~/server/utils/api-error";

/** Start week and length of a rollout, from a request body or query. */
export function readGenerationRange(input: Record<string, unknown>): { year: number; week: number; weeks: number } {
  const year = validateYear(input.year, "year", { required: true })!;
  const week = validateWeek(input.week, "week", { required: true })!;
  const { generateWeeksMin, generateWeeksMax } = getShiftplanGenerationConfig();
  const weeks = validateInteger(input.weeks, "weekCount", {
    required: true,
    min: generateWeeksMin,
    max: generateWeeksMax,
  })!;

  if (week > isoWeeksInYear(year)) {
    throw apiError(null, 400, "errors.shiftplan.noSuchWeek", { year, week });
  }

  return { year, week, weeks };
}
