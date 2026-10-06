import { MemberAccessService } from "~/server/services/member-access.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateId } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  requirePlanner(event);
  const staffId = getQuery(event).staffId;
  return MemberAccessService.listSessions(staffId ? validateId(staffId, "staffId") : undefined);
});
