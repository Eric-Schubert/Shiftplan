import { ShiftplanService } from "~/server/services/shiftplan.service";
export default defineEventHandler(async (event) => {
  const body = await readBody<{ staff_id: number; shift_id: number; year: number; week: number }>(event);
  if (!body.staff_id || !body.shift_id || !body.year || !body.week) {
    throw createError({ statusCode: 400, statusMessage: "staff_id, shift_id, year und week erforderlich" });
  }
  const weekData = ShiftplanService.getOrCreateWeek(body.year, body.week);
  const success = ShiftplanService.assignStaff(body.staff_id, body.shift_id, weekData.week_id);
  if (!success) throw createError({ statusCode: 500, statusMessage: "Zuweisung fehlgeschlagen" });
  return { success: true };
});
