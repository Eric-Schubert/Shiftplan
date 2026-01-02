import { RotationService } from "~/server/services/rotation.service";
import type { RotationConfigUpdateDTO } from "~/types/rotation";

export default defineEventHandler(async (event) => {
  const body = await readBody<RotationConfigUpdateDTO>(event);

  // Validierung
  if (body.cycle_length !== undefined && (body.cycle_length < 1 || body.cycle_length > 12)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Zykluslänge muss zwischen 1 und 12 liegen",
    });
  }

  return RotationService.updateConfig(body);
});
