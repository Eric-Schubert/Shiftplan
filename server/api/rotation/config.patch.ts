import { RotationService } from "~/server/services/rotation.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateInteger, validateYear, validateWeek } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody(event);

  const cycle_length = validateInteger(body.cycle_length, "Zykluslänge", {
    min: 1,
    max: 12,
  });
  const start_year = validateYear(body.start_year, "Startjahr");
  const start_week = validateWeek(body.start_week, "Startwoche");

  if (cycle_length === undefined && start_year === undefined && start_week === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "Keine Änderungen angegeben",
    });
  }

  return RotationService.updateConfig({
    ...(cycle_length !== undefined && { cycle_length }),
    ...(start_year !== undefined && { start_year }),
    ...(start_week !== undefined && { start_week }),
  });
});
