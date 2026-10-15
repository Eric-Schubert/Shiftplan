import type { ShiftRequest } from "../types/shift-request";
import { todayISO } from "./week-dates";

export type RequestAction = "accept" | "decline" | "cancel" | "request_undo" | "confirm_undo" | "decline_undo";

/**
 * One action per own request: withdraw it, ask for an undo or drop the ask. An undo is offered until
 * the day before in the member's own time zone; the server checks the rest.
 */
export function ownRequestAction(
  request: ShiftRequest,
  memberId: number,
  today = todayISO()
): { label: string; action: RequestAction } | null {
  const open = request.status === "open" || request.status === "pending_approval";
  if (request.requester_staff_id === memberId && open) return { label: "Zurückziehen", action: "cancel" };
  if (request.partner_staff_id === memberId && request.status === "pending_approval") {
    return { label: "Zusage zurückziehen", action: "cancel" };
  }
  if (request.status !== "done" || request.partner_staff_id === null) return null;
  if (request.undo_requested_by === memberId) return { label: "Storno zurückziehen", action: "decline_undo" };
  return request.undo_requested_by === null && request.date_from > today ? { label: "Stornieren", action: "request_undo" } : null;
}
