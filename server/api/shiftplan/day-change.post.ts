import { AuditService } from "~/server/services/audit.service";
import { DayChangeService } from "~/server/services/day-change.service";
import { PushService } from "~/server/services/push.service";
import { requestSource } from "~/server/utils/absence-flow";
import { formatNoticeDay } from "~/server/utils/absence-notice";
import { requirePlanner } from "~/server/utils/auth";
import { weekOfDate } from "~/server/utils/iso-week";
import { validateId } from "~/server/utils/validation";

/** Puts someone into or out of a shift for a single day, on top of the weekly plan. */
export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  const body = await readBody(event);

  if (typeof body?.present !== "boolean") {
    throw createError({ statusCode: 400, statusMessage: "present muss true oder false sein" });
  }
  const staffId = validateId(body?.staff_id, "staff_id");
  const shiftId = validateId(body?.shift_id, "shift_id");
  const source = requestSource(event);

  const change = DayChangeService.setPresence({
    staffId,
    shiftId,
    date: body?.date,
    present: body.present,
    source,
    createdBy: user.username,
  });

  if (change) {
    const { year, week } = weekOfDate(body.date);
    AuditService.log({
      userId: user.userId,
      username: user.username,
      action: change.kind === "add" ? "day_add" : "day_remove",
      year,
      weekNumber: week,
      shiftId,
      staffId,
      reason: `nur ${formatNoticeDay(body.date)}`,
      source,
    });
    PushService.queueShiftChange(
      { year, week, shiftId, staffId, action: change.kind === "add" ? "assign" : "unassign", date: body.date },
      getHeader(event, "origin")
    );
  }

  return { success: true, changed: change !== null };
});
