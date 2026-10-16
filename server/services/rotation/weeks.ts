import { getConfig } from "~/server/services/rotation/config";
import { patternWeekFor } from "~/shared/utils/rotation-math";

export function calculatePatternWeek(year: number, weekNumber: number): number {
  const config = getConfig();
  return patternWeekFor(config.cycle_length, { year: config.start_year, week: config.start_week }, year, weekNumber);
}
