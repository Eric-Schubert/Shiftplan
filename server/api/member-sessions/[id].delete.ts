import { MemberAccessService } from "~/server/services/member-access.service";
import { requirePlanner } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  requirePlanner(event);
  const sessionId = getRouterParam(event, "id");
  if (!sessionId || !MemberAccessService.revokeSession(sessionId)) {
    throw createError({ statusCode: 404, statusMessage: "Gerät nicht gefunden" });
  }
  return { success: true };
});
