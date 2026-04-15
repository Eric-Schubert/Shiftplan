import { RotationService } from "~/server/services/rotation.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateId, validateInteger } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody(event);

  const pattern_week = validateInteger(body.pattern_week, "Musterwoche", {
    required: true,
    min: 1,
    max: 12,
  })!;
  const staff_id = validateId(body.staff_id, "staff_id");
  const shift_id = validateId(body.shift_id, "shift_id");

  const success = RotationService.unassignFromPattern(pattern_week, staff_id, shift_id);

  return { success };
});
