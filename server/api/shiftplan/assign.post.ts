import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { AuditService } from "~/server/services/audit.service";

export default defineEventHandler(async (event) => {
  // Admin und Planner dürfen zuweisen
  const user = requirePlanner(event);

  const body = await readBody<{
    staff_id: number;
    shift_id: number;
    year: number;
    week: number;
    reason?: string;
  }>(event);

  if (!body.staff_id || !body.shift_id || !body.year || !body.week) {
    throw createError({
      statusCode: 400,
      statusMessage: "staff_id, shift_id, year und week erforderlich",
    });
  }

  const weekData = ShiftplanService.getOrCreateWeek(body.year, body.week);
  const success = ShiftplanService.assignStaff(body.staff_id, body.shift_id, weekData.week_id);

  if (!success) {
    throw createError({ statusCode: 500, statusMessage: "Zuweisung fehlgeschlagen" });
  }

  // Audit-Log schreiben
  AuditService.log({
    userId: user.userId,
    username: user.username,
    action: "assign",
    year: body.year,
    weekNumber: body.week,
    shiftId: body.shift_id,
    staffId: body.staff_id,
    reason: body.reason,
  });

  return { success: true };
});
