import { ShiftRequestService } from "~/server/services/shift-request.service";
import { requireAdmin } from "~/server/utils/auth";

/** Whether takeovers and swaps need a planner's approval after the colleague agreed. */
export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody(event);
  if (typeof body?.requiresApproval !== "boolean") {
    throw createError({ statusCode: 400, statusMessage: "requiresApproval muss true oder false sein" });
  }
  ShiftRequestService.setRequiresApproval(body.requiresApproval);
  return { requiresApproval: ShiftRequestService.requiresApproval() };
});
