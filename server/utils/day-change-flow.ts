import { AuditService } from "~/server/services/audit.service";
import { DayChangeService } from "~/server/services/day-change.service";
import { PushService } from "~/server/services/push.service";
import { formatNoticeDay } from "~/server/utils/absence-notice";
import { weekOfDate } from "~/server/utils/iso-week";

export type DayChangeActor = { userId: number; username: string; source: "web" | "app" };

/**
 * One day-level change with everything around it: audit entry and the bundled
 * push for short-term changes. Returns whether the day actually changed.
 */
export function applyDayChange(input: {
  staffId: number;
  shiftId: number;
  date: string;
  present: boolean;
  actor: DayChangeActor;
  /** Shown in the audit log instead of the plain day, e.g. „Übernahme für Anna Weber“. */
  note?: string;
  requestId?: number;
  origin?: string;
}): boolean {
  const change = DayChangeService.setPresence({
    staffId: input.staffId,
    shiftId: input.shiftId,
    date: input.date,
    present: input.present,
    source: input.actor.source,
    createdBy: input.actor.username,
    requestId: input.requestId,
  });
  if (!change) return false;

  const { year, week } = weekOfDate(input.date);
  const day = formatNoticeDay(input.date);
  AuditService.log({
    userId: input.actor.userId,
    username: input.actor.username,
    action: change.kind === "add" ? "day_add" : "day_remove",
    year,
    weekNumber: week,
    shiftId: input.shiftId,
    staffId: input.staffId,
    reason: input.note ? `${input.note}, ${day}` : `nur ${day}`,
    source: input.actor.source,
  });
  PushService.queueShiftChange(
    {
      year,
      week,
      shiftId: input.shiftId,
      staffId: input.staffId,
      action: change.kind === "add" ? "assign" : "unassign",
      date: input.date,
    },
    input.origin
  );
  return true;
}
