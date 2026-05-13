import { RotationService } from "~/server/services/rotation.service";
import { requirePlanner } from "~/server/utils/auth";
import { getRotationValidationConfig } from "~/server/config/domain-config";
import { validateId, validateInteger } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readBody(event);
  const rotationConfig = getRotationValidationConfig();

  const pattern_week = validateInteger(body.pattern_week, "Musterwoche", {
    required: true,
    min: rotationConfig.cycleLengthMin,
    max: rotationConfig.cycleLengthMax,
  })!;
  const staff_id = validateId(body.staff_id, "staff_id");
  const shift_id = validateId(body.shift_id, "shift_id");

  const success = RotationService.assignToPattern(pattern_week, staff_id, shift_id);

  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Zuweisung fehlgeschlagen",
    });
  }

  return { success: true };
});
