import { RotationService } from "~/server/services/rotation.service";
import { requirePlanner } from "~/server/utils/auth";
import { getRotationValidationConfig } from "~/server/config/domain-config";
import { validateId, validateInteger } from "~/server/utils/validation";
import { readObjectBody } from "~/server/utils/json-body";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readObjectBody(event);
  const rotationConfig = getRotationValidationConfig();

  const patternWeek = validateInteger(body.pattern_week, "patternWeek", {
    required: true,
    min: rotationConfig.cycleLengthMin,
    max: rotationConfig.cycleLengthMax,
  });
  const staffId = validateId(body.staff_id, "staff_id");
  const shiftId = validateId(body.shift_id, "shift_id");

  const success = RotationService.unassignFromPattern(patternWeek, staffId, shiftId);

  return { success };
});
