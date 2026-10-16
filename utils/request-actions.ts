import type { MessageKey } from "~/i18n/types";
import type { ShiftRequest } from "../types/shift-request";
import { todayISO } from "./week-dates";

export type RequestAction = "accept" | "decline" | "cancel" | "request_undo" | "confirm_undo" | "decline_undo";

/**
 * One action per own request: withdraw it, ask for an undo or drop the ask. An undo is offered until
 * the day before in the member's own time zone; the server checks the rest.
 */
export function ownRequestAction(request: ShiftRequest, memberId: number, today = todayISO()): { label: MessageKey; action: RequestAction } | null {
  const open = request.status === "open" || request.status === "pending_approval";
  if (request.requester_staff_id === memberId && open) return { label: "requests.own.cancel", action: "cancel" };
  if (request.partner_staff_id === memberId && request.status === "pending_approval") {
    return { label: "requests.own.withdrawAccept", action: "cancel" };
  }
  if (request.status !== "done" || request.partner_staff_id === null) return null;
  if (request.undo_requested_by === memberId) return { label: "requests.own.withdrawUndo", action: "decline_undo" };
  return request.undo_requested_by === null && request.date_from > today ? { label: "requests.own.undo", action: "request_undo" } : null;
}
