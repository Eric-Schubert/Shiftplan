import { AuditService, type AuditReason } from "~/server/services/audit.service";
import { DayChangeService } from "~/server/services/day-change/store";
import { PushService } from "~/server/services/push.service";
import { weekOfDate } from "~/shared/utils/week";

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
  /** Audit reason instead of the plain day, e.g. the request behind it; it gets the day as `date`. */
  note?: AuditReason;
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
  const reason: AuditReason = input.note
    ? { key: input.note.key, params: { ...input.note.params, date: input.date } }
    : { key: "audit.reason.day", params: { date: input.date } };
  AuditService.log({
    userId: input.actor.userId,
    username: input.actor.username,
    action: change.kind === "add" ? "day_add" : "day_remove",
    year,
    weekNumber: week,
    shiftId: input.shiftId,
    staffId: input.staffId,
    reason,
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
