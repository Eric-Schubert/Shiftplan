import { RotationService } from "~/server/services/rotation.service";
import { requirePlanner } from "~/server/utils/auth";
import { getRotationValidationConfig } from "~/server/config/domain-config";
import { validateInteger, validateYear, validateWeek } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";
import { readObjectBody } from "~/server/utils/json-body";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readObjectBody(event);
  const rotationConfig = getRotationValidationConfig();

  const cycleLength = validateInteger(body.cycle_length, "cycleLength", {
    min: rotationConfig.cycleLengthMin,
    max: rotationConfig.cycleLengthMax,
  });
  const startYear = validateYear(body.start_year, "startYear");
  const startWeek = validateWeek(body.start_week, "startWeek");

  // The start week has to exist in the start year, also when only one of them changes.
  if (startYear !== undefined || startWeek !== undefined) {
    const current = RotationService.getConfig();
    validateWeek(startWeek ?? current.start_week, "startWeek", { year: startYear ?? current.start_year });
  }

  if (cycleLength === undefined && startYear === undefined && startWeek === undefined) {
    throw apiError(event, 400, "errors.common.noChanges");
  }

  return RotationService.updateConfig({
    ...(cycleLength !== undefined && { cycle_length: cycleLength }),
    ...(startYear !== undefined && { start_year: startYear }),
    ...(startWeek !== undefined && { start_week: startWeek }),
  });
});
