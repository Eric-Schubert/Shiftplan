import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateId, validateYear, validateWeek } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readBody(event);

  // Input-Validierung
  const staff_id = validateId(body.staff_id, "staff_id");
  const shift_id = validateId(body.shift_id, "shift_id");
  const year = validateYear(body.year, "Jahr", { required: true })!;
  const week = validateWeek(body.week, "Woche", { required: true })!;

  const weekData = ShiftplanService.getOrCreateWeek(year, week);
  const success = ShiftplanService.unassignStaff(staff_id, shift_id, weekData.week_id);

  return { success };
});
