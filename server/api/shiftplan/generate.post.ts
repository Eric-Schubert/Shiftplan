import { ShiftplanService } from "~/server/services/shiftplan.service";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ year: number; week: number }>(event);

  if (!body.year || !body.week) {
    throw createError({
      statusCode: 400,
      statusMessage: "Jahr und Woche sind erforderlich",
    });
  }

  return ShiftplanService.generateAutoPlan(body.year, body.week);
});
