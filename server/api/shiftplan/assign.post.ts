import { AuditService } from "~/server/services/audit.service";
import { PushService } from "~/server/services/push.service";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateId, validateYear, validateWeek } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);

  const body = await readBody(event);

  const staffId = validateId(body.staff_id, "staff_id");
  const shiftId = validateId(body.shift_id, "shift_id");
  const year = validateYear(body.year, "year", { required: true });
  const week = validateWeek(body.week, "week", { required: true });

  const weekData = ShiftplanService.getOrCreateWeek(year, week);
  const wasAssigned = ShiftplanService.hasAssignment(staffId, shiftId, weekData.week_id);
  const success = ShiftplanService.assignStaff(staffId, shiftId, weekData.week_id);

  if (!success) {
    throw apiError(event, 500, "errors.common.assignFailed");
  }

  if (!wasAssigned) {
    AuditService.log({
      userId: user.userId,
      username: user.username,
      action: "assign",
      year,
      weekNumber: week,
      shiftId,
      staffId,
      source: requestSource(event),
    });
    PushService.queueShiftChange(
      { year, week, shiftId, staffId, action: "assign" },
      getHeader(event, "origin")
    );
  }

  return { success: true };
});
