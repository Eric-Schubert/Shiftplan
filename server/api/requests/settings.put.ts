import { ShiftRequestService } from "~/server/services/shift-request.service";
import { requireAdmin } from "~/server/utils/auth";
import { apiError } from "~/server/utils/api-error";
import { readObjectBody } from "~/server/utils/json-body";

/** Whether takeovers and swaps need a planner's approval after the colleague agreed. */
export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readObjectBody(event);
  if (typeof body?.requiresApproval !== "boolean") {
    throw apiError(event, 400, "errors.requests.requiresApprovalBoolean");
  }
  ShiftRequestService.setRequiresApproval(body.requiresApproval);
  return { requiresApproval: ShiftRequestService.requiresApproval() };
});
