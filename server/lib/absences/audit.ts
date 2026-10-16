import type { Absence } from "~/server/services/absence.service";
import { AuditService } from "~/server/services/audit.service";
import { formatNoticeDay } from "~/server/utils/absence-notice";
import { weekOfDate } from "~/shared/utils/week";

export type Actor = { userId: number; username: string; source: "web" | "app" };

/** One audit entry per ISO week, with the affected days as note (never the reason). */
export function logPerWeek(absences: Absence[], action: "absence" | "absence_cancel", actor: Actor): void {
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
