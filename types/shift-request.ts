export type ShiftRequestStatus =
  | "open"
  | "pending_approval"
  | "done"
  | "declined"
  | "rejected"
  | "cancelled"
  | "reverted";

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
}

export const REQUEST_STATUS_LABELS: Record<ShiftRequestStatus, string> = {
  open: "Offen",
  pending_approval: "Wartet auf Freigabe",
  done: "Durchgeführt",
  declined: "Abgelehnt (Kollegin/Kollege)",
  rejected: "Abgelehnt (Planung)",
  cancelled: "Zurückgezogen",
  reverted: "Zurückgenommen",
};
