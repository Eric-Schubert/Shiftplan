export const ABSENCE_REASONS = ["urlaub", "privat", "sonstiges"] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];
export const ABSENCE_NOTE_MAX_LENGTH = 200;
/** Longest range that can be entered at once (8 weeks). */
export const ABSENCE_MAX_DAYS = 56;

export type Absence = {
  absence_id: number;
  staff_id: number;
  staff_name: string;
  absence_date: string;
  shift_id: number | null;
  shift_name: string | null;
  reason: AbsenceReason | null;
  note: string | null;
  /** Shared by all days entered as one range; null for a single day. */
  batch_id: string | null;
  /** First and last active day of the range (the day itself for a single day). */
  range_from: string;
  range_to: string;
  source: "web" | "app";
  created_by: string;
  created_at: string;
};

export type PublicAbsence = Omit<Absence, "reason" | "note">;
