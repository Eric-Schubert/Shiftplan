import { getShiftplanGenerationConfig } from "~/server/config/domain-config";
import { validateYear, validateWeek, validateInteger } from "~/server/utils/validation";

/** Start week and length of a rollout, from a request body or query. */
export function readGenerationRange(input: Record<string, unknown>): { year: number; week: number; weeks: number } {
  const year = validateYear(input.year, "year", { required: true });
  const week = validateWeek(input.week, "week", { required: true, year });
  const { generateWeeksMin, generateWeeksMax } = getShiftplanGenerationConfig();
  const weeks = validateInteger(input.weeks, "weekCount", {
    required: true,
    min: generateWeeksMin,
    max: generateWeeksMax,
  });

  return { year, week, weeks };
}
