import { AuditService } from "~/server/services/audit.service";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateYear, validateBoolean } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";
import { readObjectBody } from "~/server/utils/json-body";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);

  const body = await readObjectBody(event);

  const sourceYear = validateYear(body.sourceYear, "sourceYear", { required: true });
  const targetYear = validateYear(body.targetYear, "targetYear", { required: true });
  const overwrite = validateBoolean(body.overwrite, "overwrite") === 1;

  if (sourceYear === targetYear) {
    throw apiError(event, 400, "errors.shiftplan.sameYears");
  }

  const sourceWeeks = ShiftplanService.plannedWeeks(sourceYear);
  if (sourceWeeks.length === 0) {
    throw apiError(event, 404, "errors.shiftplan.noPlans", { year: sourceYear });
  }

  const weeksWithAssignments = sourceWeeks.filter((week) => week.assignments > 0);
  if (weeksWithAssignments.length === 0) {
    throw apiError(event, 404, "errors.shiftplan.noAssignments", { year: sourceYear });
  }

  const result = ShiftplanService.copyYear(weeksWithAssignments, targetYear, overwrite);

  // Like a rollout: one entry for the whole copy. Copies go out without a push, as rollouts do.
  if (result.copiedWeeks > 0) {
    AuditService.log({
      userId: user.userId,
      username: user.username,
      action: "generate",
      year: targetYear,
      weekNumber: weeksWithAssignments[0]!.week_number,
      reason: {
        // Overwriting and skipping exclude each other: the overwrite flag decides.
        key:
          result.overwrittenWeeks > 0
            ? "audit.reason.yearCopiedOverwritten"
            : result.skippedWeeks > 0
              ? "audit.reason.yearCopiedSkipped"
              : "audit.reason.yearCopied",
        params: { count: result.copiedWeeks, sourceYear, targetYear, overwritten: result.overwrittenWeeks, skipped: result.skippedWeeks },
      },
      source: requestSource(event),
    });
  }

  return {
    success: true,
    sourceYear,
    targetYear,
    ...result,
    totalSourceWeeks: weeksWithAssignments.length,
  };
});
