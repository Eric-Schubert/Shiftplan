import { AuditService } from "~/server/services/audit.service";
import { ShiftplanService, readGenerationRange } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateBoolean } from "~/server/utils/validation";
import { readObjectBody } from "~/server/utils/json-body";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);

  const body = await readObjectBody(event);

  // Without `weeks` it is the fill-from-pattern button of the week view: one week, with the same checks,
  // transaction and audit entry as a rollout.
  const hasWeeksParameter = body.weeks !== undefined && body.weeks !== null && body.weeks !== "";
  const { year, week, weeks } = readGenerationRange({ year: body.year, week: body.week, weeks: hasWeeksParameter ? body.weeks : 1 });
  // Older clients sent no flag and always overwrote.
  const overwrite = validateBoolean(body.overwrite, "overwrite") !== 0;
  const result = ShiftplanService.generateMultipleWeeks(year, week, weeks, { overwrite });

  const last = result.weeks.at(-1);
  if (result.generated > 0 && last) {
    // Overwriting and skipping exclude each other: the overwrite flag decides.
    const key =
      result.overwritten > 0 ? "audit.reason.generatedOverwritten" : result.skipped > 0 ? "audit.reason.generatedSkipped" : "audit.reason.generated";

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
