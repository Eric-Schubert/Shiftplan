import { MemberAccessService } from "~/server/services/member-access.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateId } from "~/server/utils/validation";

/** Forgotten PIN: the planner removes it, the person sets a new one after the next QR sign-in. */
export default defineEventHandler((event) => {
  requirePlanner(event);
  const staffId = validateId(getRouterParam(event, "id"), "ID");
  return { removed: MemberAccessService.clearPin(staffId) };
});
