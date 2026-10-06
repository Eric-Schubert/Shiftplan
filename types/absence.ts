export type AbsenceReason = "urlaub" | "privat" | "sonstiges";

export interface Absence {
  absence_id: number;
  staff_id: number;
  staff_name: string;
  absence_date: string;
  shift_id: number | null;
  shift_name: string | null;
  /** Only present for planners. */
  reason?: AbsenceReason | null;
  note?: string | null;
  /** Shared by all days entered as one range; null for a single day. */
  batch_id: string | null;
  range_from: string;
  range_to: string;
  source: "web" | "app";
  created_by: string;
  created_at: string;
}

export interface MemberDevice {
  sessionId: string;
  staffId: number;
  staffName: string;
  deviceName: string | null;
  createdAt: number;
  lastSeenAt: number;
}

export const ABSENCE_REASON_LABELS: Record<AbsenceReason, string> = {
  urlaub: "Urlaub",
  privat: "Privat",
  sonstiges: "Sonstiges",
};

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** „Do 08.10.“ for a YYYY-MM-DD date. */
export function formatAbsenceDay(date: string, withDate = true): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return withDate ? `${weekday} ${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.` : weekday!;
}

/** „Do 08.10.“ or „Mo 12.10. – Fr 23.10.“ for the range of an absence. */
export function formatAbsenceRange(absence: Pick<Absence, "range_from" | "range_to">): string {
  return absence.range_from === absence.range_to
    ? formatAbsenceDay(absence.range_from)
    : `${formatAbsenceDay(absence.range_from)} – ${formatAbsenceDay(absence.range_to)}`;
}
