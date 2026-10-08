import { AbsenceService, type Absence, type AbsenceReason } from "~/server/services/absence.service";
import { AuditService } from "~/server/services/audit.service";
import { ShiftRequestService } from "~/server/services/shift-request.service";
import { createTakeover } from "~/server/utils/shift-request-flow";
import { PushService } from "~/server/services/push.service";
import { buildAbsenceNotice, formatNoticeDay } from "~/server/utils/absence-notice";
import { weekOfDate } from "~/server/utils/iso-week";

type Actor = { userId: number; username: string; source: "web" | "app" };

/** One audit entry per ISO week, with the affected days as note (never the reason). */
function logPerWeek(absences: Absence[], action: "absence" | "absence_cancel", actor: Actor): void {
  const weeks = new Map<string, Absence[]>();
  for (const absence of absences) {
    const { year, week } = weekOfDate(absence.absence_date);
    const key = `${year}-${week}`;
    weeks.set(key, [...(weeks.get(key) ?? []), absence]);
  }

  for (const days of weeks.values()) {
    const first = days[0]!;
    const last = days[days.length - 1]!;
    const { year, week } = weekOfDate(first.absence_date);
    const shiftIds = new Set(days.map((day) => day.shift_id));
    AuditService.log({
      userId: actor.userId,
      username: actor.username,
      action,
      year,
      weekNumber: week,
      shiftId: shiftIds.size === 1 ? (first.shift_id ?? undefined) : undefined,
      staffId: first.staff_id,
      reason:
        days.length === 1
          ? formatNoticeDay(first.absence_date)
          : `${formatNoticeDay(first.absence_date)} – ${formatNoticeDay(last.absence_date)}`,
      source: actor.source,
    });
  }
}

/** Creates the absence days, logs them and tells the team. A failed push never undoes the absence. */
export async function reportAbsence(input: {
  staffId: number;
  from: string;
  to?: string | null;
  shiftId?: number | null;
  reason: AbsenceReason;
  note?: string | null;
  notifyTeam: boolean;
  message?: string | null;
  /** Open a takeover request for every day of the absence that has a shift. */
  seekTakeover?: boolean;
  actor: Actor;
}): Promise<{ absences: Absence[]; skipped: string[]; notified: { sent: number; failed: number } | null }> {
  const { absences, skipped } = AbsenceService.create({
    staffId: input.staffId,
    from: input.from,
    to: input.to,
    shiftId: input.shiftId,
    reason: input.reason,
    note: input.note,
    source: input.actor.source,
    createdBy: input.actor.username,
  });
  logPerWeek(absences, "absence", input.actor);

  if (input.seekTakeover) {
    const today = new Date().toISOString().slice(0, 10);
    for (const absence of absences) {
      if (absence.shift_id === null || absence.absence_date < today) continue;
      try {
        await createTakeover({
          staffId: absence.staff_id,
          staffName: absence.staff_name,
          date: absence.absence_date,
          shiftId: absence.shift_id,
          message: input.message,
          absenceId: absence.absence_id,
          notifyTeam: false,
        });
      } catch (error) {
        // The shift may already have a request; the absence itself stays valid.
        console.warn("[absence] Übernahme-Anfrage nicht angelegt:", (error as Error).message);
      }
    }
  }

  let notified = null;
  if (input.notifyTeam) {
    const first = absences[0]!;
    const last = absences[absences.length - 1]!;
    try {
      notified = await PushService.sendTeamNotice(
        buildAbsenceNotice({
          staffName: first.staff_name,
          from: first.absence_date,
          to: last.absence_date,
          shiftName: first.shift_name,
          message: input.message,
          seekingTakeover: input.seekTakeover,
        }),
        { excludeStaffId: first.staff_id }
      );
    } catch (error) {
      console.error("[absence] Team-Push fehlgeschlagen:", error);
    }
  }

  return { absences, skipped, notified };
}

/** Withdraws one day, or the whole range when `wholeRange` is set. */
export function cancelAbsence(absence: Absence, actor: Actor, wholeRange = false): number {
  const affected = wholeRange && absence.batch_id ? AbsenceService.listBatch(absence.batch_id) : [absence];
  if (wholeRange && absence.batch_id) AbsenceService.cancelBatch(absence.batch_id);
  else AbsenceService.cancel(absence.absence_id);
  ShiftRequestService.cancelForAbsence(affected.map((entry) => entry.absence_id));
  logPerWeek(affected, "absence_cancel", actor);
  return affected.length;
}

/** Planners use cookies in the browser and a Bearer token in the app. */
export function requestSource(event: any): "web" | "app" {
  return getHeader(event, "authorization")?.startsWith("Bearer ") ? "app" : "web";
}
