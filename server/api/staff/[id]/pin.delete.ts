import { MemberAccessService } from "~/server/services/member-access.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateId } from "~/server/utils/validation";

/** Forgotten PIN: the planner removes it, the person sets a new one after the next QR sign-in. */
export default defineEventHandler((event) => {
  requirePlanner(event);
  const staffId = validateId(getRouterParam(event, "id"), "recordId");
  const removed = MemberAccessService.clearPin(staffId);
  // No sign-in that may know the old PIN can set the next one without it.
  MemberAccessService.revokeOtherSessions(staffId, null);
  return { removed };
});
