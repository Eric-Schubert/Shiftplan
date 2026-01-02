import { RotationService } from "~/server/services/rotation.service";
import type { RotationPatternAssignDTO } from "~/types/rotation";

export default defineEventHandler(async (event) => {
  const body = await readBody<RotationPatternAssignDTO>(event);

  if (!body.pattern_week || !body.staff_id || !body.shift_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "pattern_week, staff_id und shift_id sind erforderlich",
    });
  }

  const success = RotationService.assignToPattern(
    body.pattern_week,
    body.staff_id,
    body.shift_id
  );

  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Zuweisung fehlgeschlagen - ungültige Musterwoche",
    });
  }

  return { success: true };
});
