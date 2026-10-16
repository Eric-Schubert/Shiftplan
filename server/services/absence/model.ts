export const ABSENCE_REASONS = ["urlaub", "privat", "sonstiges"] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];
export const ABSENCE_NOTE_MAX_LENGTH = 200;
// The web forms name these limits too.
export { ABSENCE_ADMIN_MAX_DAYS, ABSENCE_MAX_DAYS } from "~/shared/utils/limits";

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

/** What the team sees: no reason, note or the user name of whoever entered it. */
export type PublicAbsence = Omit<Absence, "reason" | "note" | "created_by">;
