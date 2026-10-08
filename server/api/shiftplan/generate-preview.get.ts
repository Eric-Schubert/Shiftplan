import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { readGenerationRange } from "~/server/utils/generation-range";

export default defineEventHandler((event) => {
  requirePlanner(event);

  const query = getQuery(event);
  const { year, week, weeks } = readGenerationRange({
    year: query.year,
    week: query.week,
    weeks: query.weeks,
  });
  return { weeks: ShiftplanService.previewGeneration(year, week, weeks) };
});
