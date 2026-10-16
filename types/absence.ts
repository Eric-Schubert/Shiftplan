import type { MessageKey } from "~/i18n/types";

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

/** Catalog keys of the reason labels; the reasons themselves are wire values. */
export const ABSENCE_REASON_KEYS = {
  urlaub: "absence.reasons.urlaub",
  privat: "absence.reasons.privat",
  sonstiges: "absence.reasons.sonstiges",
} as const satisfies Record<AbsenceReason, MessageKey>;
