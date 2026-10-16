import { RotationService } from "~/server/services/rotation.service";
import { requirePlanner } from "~/server/utils/auth";
import { getRotationValidationConfig } from "~/server/config/domain-config";
import { validateInteger, validateYear, validateWeek } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readBody(event);
  const rotationConfig = getRotationValidationConfig();

  const cycle_length = validateInteger(body.cycle_length, "cycleLength", {
    min: rotationConfig.cycleLengthMin,
    max: rotationConfig.cycleLengthMax,
  });
  const start_year = validateYear(body.start_year, "startYear");
  const start_week = validateWeek(body.start_week, "startWeek");

  if (cycle_length === undefined && start_year === undefined && start_week === undefined) {
    throw apiError(event, 400, "errors.common.noChanges");
  }

  return RotationService.updateConfig({
    ...(cycle_length !== undefined && { cycle_length }),
    ...(start_year !== undefined && { start_year }),
    ...(start_week !== undefined && { start_week }),
  });
});
