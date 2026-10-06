export type AbsenceReason = "krank" | "privat" | "sonstiges";

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
  krank: "Krank",
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
