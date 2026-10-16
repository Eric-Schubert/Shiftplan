import { DEFAULT_LOCALE } from "~/i18n/config";
import { logPerWeek, type Actor } from "~/server/services/absence/audit";
import type { Absence, AbsenceReason } from "~/server/services/absence/model";
import { buildAbsenceNotice } from "~/server/services/absence/notice";
import { AbsenceService } from "~/server/services/absence/store";
import { PushService } from "~/server/services/push.service";
import { requestTakeover } from "~/server/services/shift-request.service";
import { planningToday } from "~/server/utils/planning-date";

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
  maxDays?: number;
  /** Leave out Saturdays and Sundays, for teams that never work weekends. */
  weekdaysOnly?: boolean;
  /** First day that may be entered; staff report from today on only. */
  notBefore?: string;
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
    maxDays: input.maxDays,
    weekdaysOnly: input.weekdaysOnly,
    notBefore: input.notBefore,
  });
  logPerWeek(absences, "absence", input.actor);

  let takeovers = 0;
  if (input.seekTakeover) {
    const today = planningToday();
    for (const absence of absences) {
      if (absence.shift_id === null || absence.absence_date < today) continue;
      try {
        await requestTakeover({
          staffId: absence.staff_id,
          staffName: absence.staff_name,
          date: absence.absence_date,
          shiftId: absence.shift_id,
          message: input.message,
          absenceId: absence.absence_id,
          notifyTeam: false,
        });
        takeovers += 1;
      } catch (error) {
        // The shift may already have a request; the absence itself stays valid.
        console.warn("[absence] Takeover request not created:", (error as Error).message);
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
          locale: DEFAULT_LOCALE,
          staffName: first.staff_name,
          from: first.absence_date,
          to: last.absence_date,
          shiftName: first.shift_name,
          message: input.message,
          // Only ask who takes over when there is a request to take up.
          seekingTakeover: takeovers > 0,
        }),
        { excludeStaffId: first.staff_id }
      );
    } catch (error) {
      console.error("[absence] Team push failed:", error);
    }
  }

  return { absences, skipped, notified };
}
