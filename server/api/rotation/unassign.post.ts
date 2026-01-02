import { RotationService } from "~/server/services/rotation.service";
import type { RotationPatternUnassignDTO } from "~/types/rotation";

export default defineEventHandler(async (event) => {
  const body = await readBody<RotationPatternUnassignDTO>(event);

  if (!body.pattern_week || !body.staff_id || !body.shift_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "pattern_week, staff_id und shift_id sind erforderlich",
    });
  }

  const success = RotationService.unassignFromPattern(
    body.pattern_week,
    body.staff_id,
    body.shift_id
  );

  return { success };
});
