import type { MessageKey } from "~/i18n/types";

export type ShiftRequestStatus = "open" | "pending_approval" | "done" | "declined" | "rejected" | "cancelled" | "reverted";

export interface ShiftRequest {
  request_id: number;
  kind: "takeover" | "swap";
  status: ShiftRequestStatus;
  requester_staff_id: number;
  requester_name: string;
  partner_staff_id: number | null;
  partner_name: string | null;
  shift_id: number | null;
  shift_name: string | null;
  date_from: string;
  date_to: string;
  message: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  /** Who asked to undo the finished request; the other person confirms or declines. */
  undo_requested_by: number | null;
}

/** Catalog keys of the status labels. */
export const REQUEST_STATUS_KEYS = {
  open: "requests.status.open",
  pending_approval: "requests.status.pending_approval",
  done: "requests.status.done",
  declined: "requests.status.declined",
  rejected: "requests.status.rejected",
  cancelled: "requests.status.cancelled",
  reverted: "requests.status.reverted",
} as const satisfies Record<ShiftRequestStatus, MessageKey>;
