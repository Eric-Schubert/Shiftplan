import { MemberAccessService } from "~/server/services/member-access.service";
import { requirePlanner } from "~/server/utils/auth";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler((event) => {
  requirePlanner(event);
  const sessionId = getRouterParam(event, "id");
  // Blocking a device also drops a PIN its holder may have set.
  if (!sessionId || !MemberAccessService.blockDevice(sessionId)) {
    throw apiError(event, 404, "errors.member.deviceNotFound");
  }
  return { success: true };
});
