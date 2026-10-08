import { getAdminDatabase } from "~/server/utils/database";
import { createSwap, createTakeover } from "~/server/services/shift-request/create";
import {
  appliedChanges,
  cancelForAbsence,
  getById,
  listForMember,
  listForPlanner,
  setStatus,
} from "~/server/services/shift-request/queries";
import { checkAccept, isPresent, swapChanges, takeoverChanges } from "~/server/services/shift-request/rules";

export {
  REQUEST_MESSAGE_MAX_LENGTH,
  SWAP_MAX_DAYS,
  type AppliedChange,
  type ShiftRequest,
  type ShiftRequestKind,
  type ShiftRequestStatus,
} from "~/server/services/shift-request/types";

const APPROVAL_SETTING = "requests_require_approval";

/**
 * Takeover and swap requests between staff. The weekly plan stays untouched; a request
 * that goes through becomes day-level changes for the people involved.
 */
export const ShiftRequestService = {
  requiresApproval(): boolean {
    const row = getAdminDatabase().prepare("SELECT value FROM settings WHERE key = ?").get(APPROVAL_SETTING) as
      | { value: string }
      | undefined;
    return row?.value === "1";
  },

  setRequiresApproval(required: boolean): void {
    getAdminDatabase()
      .prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
      .run(APPROVAL_SETTING, required ? "1" : "0");
  },

  getById,
  listForMember,
  listForPlanner,
  createTakeover,
  createSwap,
  swapChanges,
  takeoverChanges,
  checkAccept,
  setStatus,
  appliedChanges,
  cancelForAbsence,
  isPresent,
};
