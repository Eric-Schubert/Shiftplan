import { ShiftRequestService } from "~/server/services/shift-request.service";
import { requirePlanner } from "~/server/utils/auth";

/** Whether takeovers and swaps need a planner's approval after the colleague agreed. */
export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  if (user.role !== "admin") throw createError({ statusCode: 403, statusMessage: "Nur für Admins" });
  const body = await readBody(event);
  if (typeof body?.requiresApproval !== "boolean") {
    throw createError({ statusCode: 400, statusMessage: "requiresApproval muss true oder false sein" });
  }
  ShiftRequestService.setRequiresApproval(body.requiresApproval);
  return { requiresApproval: ShiftRequestService.requiresApproval() };
});
