import { AbsenceService, type Absence, type AbsenceReason } from "~/server/services/absence.service";
import { AuditService } from "~/server/services/audit.service";
import { PushService } from "~/server/services/push.service";
import { buildAbsenceNotice } from "~/server/utils/absence-notice";
import { parseISODate, toISOWeek } from "~/server/utils/iso-week";

type Actor = { userId: number; username: string; source: "web" | "app" };

function auditWeek(date: string) {
  const parsed = parseISODate(date)!;
  return toISOWeek(parsed.year, parsed.month, parsed.day);
}

/** Creates the absence, logs it and tells the team. A failed push never undoes the absence. */
export async function reportAbsence(input: {
  staffId: number;
  date: string;
  shiftId?: number | null;
  reason: AbsenceReason;
  note?: string | null;
  requireAssignment: boolean;
  notifyTeam: boolean;
  message?: string | null;
  actor: Actor;
}): Promise<{ absence: Absence; notified: { sent: number; failed: number } | null }> {
  const absence = AbsenceService.create({
    staffId: input.staffId,
    date: input.date,
    shiftId: input.shiftId,
    reason: input.reason,
    note: input.note,
    source: input.actor.source,
    createdBy: input.actor.username,
    requireAssignment: input.requireAssignment,
  });

  const { year, week } = auditWeek(absence.absence_date);
  AuditService.log({
    userId: input.actor.userId,
    username: input.actor.username,
    action: "absence",
    year,
    weekNumber: week,
    shiftId: absence.shift_id ?? undefined,
    staffId: absence.staff_id,
    source: input.actor.source,
  });

  let notified = null;
  if (input.notifyTeam) {
    try {
      notified = await PushService.sendTeamNotice(
        buildAbsenceNotice({
          staffName: absence.staff_name,
          date: absence.absence_date,
          shiftName: absence.shift_name,
          message: input.message,
        }),
        { excludeStaffId: absence.staff_id }
      );
    } catch (error) {
      console.error("[absence] Team-Push fehlgeschlagen:", error);
    }
  }

  return { absence, notified };
}

export function cancelAbsence(absence: Absence, actor: Actor): void {
  AbsenceService.cancel(absence.absence_id);
  const { year, week } = auditWeek(absence.absence_date);
  AuditService.log({
    userId: actor.userId,
    username: actor.username,
    action: "absence_cancel",
    year,
    weekNumber: week,
    shiftId: absence.shift_id ?? undefined,
    staffId: absence.staff_id,
    source: actor.source,
  });
}

/** Planners use cookies in the browser and a Bearer token in the app. */
export function requestSource(event: any): "web" | "app" {
  return getHeader(event, "authorization")?.startsWith("Bearer ") ? "app" : "web";
}
