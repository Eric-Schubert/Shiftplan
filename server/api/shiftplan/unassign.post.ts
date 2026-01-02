import { ShiftplanService } from "~/server/services/shiftplan.service";

interface UnassignmentBody {
  staff_id: number;
  shift_id: number;
  year: number;
  week: number;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<UnassignmentBody>(event);

  if (!body.staff_id || !body.shift_id || !body.year || !body.week) {
    throw createError({
      statusCode: 400,
      statusMessage: "staff_id, shift_id, year und week sind erforderlich",
    });
  }

  const weekData = ShiftplanService.getOrCreateWeek(body.year, body.week);
  const success = ShiftplanService.unassignStaff(
    body.staff_id,
    body.shift_id,
    weekData.week_id
  );

  return { success };
});
