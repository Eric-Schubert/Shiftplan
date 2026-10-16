import { AuditService } from "~/server/services/audit.service";
import { ShiftplanService, readGenerationRange } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateBoolean, validateYear, validateWeek } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);

  const body = await readBody(event);

  const hasWeeksParameter =
    body.weeks !== undefined && body.weeks !== null && body.weeks !== "";

  if (!hasWeeksParameter) {
    const year = validateYear(body.year, "year", { required: true })!;
    const week = validateWeek(body.week, "week", { required: true })!;
    return ShiftplanService.generateFromPattern(year, week);
  }

  const { year, week, weeks } = readGenerationRange(body);
  // Older clients sent no flag and always overwrote.
  const overwrite = validateBoolean(body.overwrite, "overwrite") !== 0;
  const result = ShiftplanService.generateMultipleWeeks(year, week, weeks, { overwrite });

  const last = result.weeks.at(-1);
  if (result.generated > 0 && last) {
    // Overwriting and skipping exclude each other: the overwrite flag decides.
    const key =
      result.overwritten > 0
        ? "audit.reason.generatedOverwritten"
        : result.skipped > 0
          ? "audit.reason.generatedSkipped"
          : "audit.reason.generated";

    AuditService.log({
      userId: user.userId,
      username: user.username,
      action: "generate",
      year,
      weekNumber: week,
      reason: {
        key,
        params: { count: result.generated, year: last.year, week: last.week, overwritten: result.overwritten, skipped: result.skipped },
      },
      source: requestSource(event),
    });
  }

  return result;
});
