export type ShiftRequestKind = "takeover" | "swap";
export type ShiftRequestStatus =
  | "open"
  | "pending_approval"
  | "done"
  | "declined"
  | "rejected"
  | "cancelled"
  | "reverted";

export type ShiftRequest = {
  request_id: number;
  kind: ShiftRequestKind;
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
};

/** One applied day change and the state before it, so a planner can undo the request. */
export type AppliedChange = { staffId: number; shiftId: number; date: string; present: boolean; before: boolean };

export const SWAP_MAX_DAYS = 56;
export const REQUEST_MESSAGE_MAX_LENGTH = 160;
